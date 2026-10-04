/**
 * C2 client price agreements, discount rules, quotes and mandate pricing.
 * Single source of truth for:
 *   - src/options.ts                                (agreement status / type options)
 *   - src/functions/validate-agreement-discounts.ts (each line's discount vs the DiscountRules)
 *   - src/functions/link-mandate-pricing.ts         (AR mandate → offerings → OpportunityLines)
 *   - ops/build-quote.mjs                           (the quote payload, from an agreement or an opportunity)
 *   - ops/trigger-preview.mjs                       (an agreement's prices over pricing.json)
 *   - verify-model.mjs                              (all of the above, on fixed cases)
 *
 * Plain ESM and dependency-free, like shared/public-pricing.mjs. Every input
 * is a REST-shaped CRM record: relations as `<name>Id` (`offeringId`,
 * `pricePointId`, …), amounts in EUR.
 *
 * Discounts are measured against the STANDARD price, not the list price: the
 * list price (the price point's annualFeeEur) less the AR + DPP bundle
 * discount when the same set of lines holds every component of a bundle. That
 * discount is computed here, never stored, so pricing a bundle the way the
 * price list does never needs approval.
 */
import { BUNDLE_DISCOUNT, BUNDLE_ITEMS, PublicPricingV1 } from './public-pricing.mjs';

// ------------------------------------------------------------------ options

export const AGREEMENT_STATUSES = [
  { value: 'DRAFT', label: 'Draft · 草稿', color: 'gray' },
  { value: 'PROPOSED', label: 'Proposed · 已提议', color: 'sky' },
  { value: 'ACCEPTED', label: 'Accepted · 已接受', color: 'blue' },
  { value: 'ACTIVE', label: 'Active · 生效', color: 'green' },
  { value: 'EXPIRED', label: 'Expired · 已过期', color: 'yellow' },
  { value: 'CANCELLED', label: 'Cancelled · 已取消', color: 'red' },
];

export const AGREEMENT_TYPES = [
  { value: 'STANDARD_PRICING', label: 'Standard pricing · 标准价格', color: 'blue' },
  { value: 'CUSTOM_PRICING', label: 'Custom pricing · 定制价格', color: 'purple' },
  { value: 'VOLUME_DISCOUNT', label: 'Volume discount · 批量折扣', color: 'turquoise' },
  { value: 'TRAINING_BUNDLE', label: 'Training bundle · 培训套餐', color: 'green' },
  { value: 'MANDATE', label: 'Mandate · 授权委托', color: 'orange' },
];

/** Agreements whose prices bind: link-mandate-pricing prices a client's lines from these. */
export const BINDING_AGREEMENT_STATUSES = ['ACCEPTED', 'ACTIVE'];

/** e.g. CPA-2026-001. */
export const AGREEMENT_CODE_PATTERN = /^CPA-\d{4}-\d{3,}$/;

/** Days an opportunity quote stays valid (an agreement quote runs to the agreement's end date). */
export const QUOTE_VALID_DAYS = 30;

// ------------------------------------------------------------------ helpers

const round2 = (n) => Math.round(n * 100) / 100;
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const isoDay = (d) => d.toISOString().slice(0, 10);
const bySortOrder = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
const byId = (records) => new Map(records.map((r) => [r.id, r]));

/** Quantity for volume / seat lines: a positive number, else 1. */
export const quantityOf = (line) => (num(line.quantity) > 0 ? line.quantity : 1);

/** A price point's list price in EUR (per year, or per seat), or null when it has none (on request). */
export const listPriceOf = (pricePoint) => (!pricePoint || pricePoint.isOnRequest === true ? null : num(pricePoint.annualFeeEur));

/** % below `reference` that `price` is, two decimals. Negative for a price above it; null without a reference. */
export function discountPercent(reference, price) {
  if (num(reference) === null || reference <= 0 || num(price) === null) return null;
  return round2(((reference - price) / reference) * 100);
}

/** True when `today` (YYYY-MM-DD) is inside from..until, inclusive; either end may be empty. */
export const isEffective = (from, until, today) =>
  (!from || String(from).slice(0, 10) <= today) && (!until || String(until).slice(0, 10) >= today);

/** WorkspaceMember / Person `name` composite → "First Last". */
export const fullName = (name) => [name?.firstName, name?.lastName].filter(Boolean).join(' ').trim();

// ---------------------------------------------------------------- bundles

/**
 * The bundles a set of offerings completes. For each BUNDLE offering whose
 * included components (two or more) ALL appear in `offeringIds`, each of
 * those components maps to the bundle's offeringCode. Components come from
 * the CRM's bundle items when there are any, else from the seed
 * (BUNDLE_ITEMS, matched by offeringCode). An offering in two complete
 * bundles takes the first.
 * @param {string[]} offeringIds
 * @param {any[]} offerings
 * @param {any[]} [bundleItems]
 * @returns {Map<string, string>} component offering id → bundle offeringCode
 */
export function completedBundles(offeringIds, offerings, bundleItems = []) {
  const present = new Set(offeringIds);
  const offeringsById = byId(offerings);
  const groups = new Map();
  if (bundleItems.length) {
    for (const item of [...bundleItems].sort(bySortOrder)) {
      if (item.included === false || !item.bundleId || !item.componentId) continue;
      const bundle = offeringsById.get(item.bundleId);
      if (!bundle || bundle.strategyType !== 'BUNDLE') continue;
      if (!groups.has(bundle.offeringCode)) groups.set(bundle.offeringCode, []);
      groups.get(bundle.offeringCode).push(item.componentId);
    }
  } else {
    const idForCode = new Map(offerings.map((o) => [o.offeringCode, o.id]));
    for (const item of BUNDLE_ITEMS) {
      const id = idForCode.get(item.component);
      if (!item.included || !id) continue;
      if (!groups.has(item.bundle)) groups.set(item.bundle, []);
      groups.get(item.bundle).push(id);
    }
  }
  const bundled = new Map();
  for (const [code, components] of groups) {
    if (components.length < 2 || !components.every((id) => present.has(id))) continue;
    for (const id of components) if (!bundled.has(id)) bundled.set(id, code);
  }
  return bundled;
}

// ------------------------------------------------------------ line pricing

/**
 * The price point a line is priced from: its own, else the offering's only
 * live (non-legacy) price point. Returns the point and, when it cannot be
 * used, why.
 */
function pricePointFor(line, offering, pricePoints, pricePointsById) {
  if (line.pricePointId) {
    const pricePoint = pricePointsById.get(line.pricePointId) ?? null;
    if (!pricePoint) return { pricePoint: null, problem: 'price point not found' };
    if (offering && pricePoint.offeringId !== offering.id) return { pricePoint: null, problem: `price point ${pricePoint.correlationId ?? pricePoint.id} belongs to another offering` };
    return { pricePoint, problem: null };
  }
  if (!offering) return { pricePoint: null, problem: 'no offering' };
  const candidates = pricePoints.filter((p) => p.offeringId === offering.id && p.isLegacy !== true);
  if (candidates.length === 1) return { pricePoint: candidates[0], problem: null };
  return { pricePoint: null, problem: candidates.length ? 'no price point chosen on a multi-price offering' : 'offering has no price points' };
}

/**
 * Prices each agreement line:
 *   listPriceEur        the price point's annualFeeEur (null: on request / unknown)
 *   bundleDiscountPercent  15 when the agreement completes the AR + DPP bundle, else 0
 *   standardPriceEur    list less the bundle discount: what the price list asks
 *   agreedPriceEur      the line's agreedPriceEur, else the standard price less
 *                       the line's discountPercent, else the standard price
 *   discountPercent     agreed vs standard (what the discount rules check)
 *   listDiscountPercent agreed vs list (what a quote shows the client)
 *   lineTotalEur        agreed × quantity
 * @param {{ lines: any[], offerings: any[], pricePoints: any[], bundleItems?: any[] }} records
 */
export function priceAgreementLines({ lines, offerings, pricePoints, bundleItems = [] }) {
  const offeringsById = byId(offerings);
  const pricePointsById = byId(pricePoints);
  const bundled = completedBundles(lines.map((l) => l.offeringId).filter(Boolean), offerings, bundleItems);

  return lines.map((line) => {
    const offering = offeringsById.get(line.offeringId) ?? null;
    const { pricePoint, problem } = pricePointFor(line, offering, pricePoints, pricePointsById);
    const listPriceEur = listPriceOf(pricePoint);
    const bundle = offering ? bundled.get(offering.id) ?? null : null;
    const bundleDiscountPercent = bundle ? BUNDLE_DISCOUNT * 100 : 0;
    const standardPriceEur = listPriceEur === null ? null : round2(listPriceEur * (1 - bundleDiscountPercent / 100));

    const stored = num(line.discountPercent);
    const agreedPriceEur =
      num(line.agreedPriceEur) ?? (standardPriceEur === null ? null : round2(standardPriceEur * (1 - (stored ?? 0) / 100)));
    // Without a standard price the stored percentage is all there is to check.
    const discount = standardPriceEur === null ? stored : discountPercent(standardPriceEur, agreedPriceEur);
    const quantity = quantityOf(line);

    return {
      lineId: line.id ?? null,
      lineName: line.name || offering?.name || 'Line',
      offeringId: offering?.id ?? null,
      offeringCode: offering?.offeringCode ?? null,
      offeringName: offering?.name ?? null,
      strategyType: offering?.strategyType ?? null,
      pricePointId: pricePoint?.id ?? null,
      correlationId: pricePoint?.correlationId ?? null,
      tier: pricePoint?.tier ?? null,
      setupFeeEur: num(pricePoint?.setupFeeEur),
      quantity,
      listPriceEur,
      bundle,
      bundleDiscountPercent,
      standardPriceEur,
      agreedPriceEur,
      discountPercent: discount,
      listDiscountPercent: listPriceEur === null ? discount : discountPercent(listPriceEur, agreedPriceEur),
      discountRationale: line.discountRationale || '',
      lineTotalEur: agreedPriceEur === null ? null : round2(agreedPriceEur * quantity),
      effectiveFrom: line.effectiveFrom ?? null,
      effectiveUntil: line.effectiveUntil ?? null,
      problem: offering ? problem : 'no offering',
    };
  });
}

/** Sum of the priced lines' totals: what DiscountRule.minAgreementValueEur compares against. */
export const agreementValueEur = (priced) => round2(priced.reduce((sum, l) => sum + (l.lineTotalEur ?? 0), 0));

// ---------------------------------------------------------- discount rules

/**
 * The one active rule that governs a line: rules for its offering beat global
 * ones (offering empty); a rule only applies when the agreement is worth at
 * least its minAgreementValueEur, and the highest applicable minimum wins
 * (bigger agreements may carry bigger discounts); ties go to the strictest.
 * Null when no rule applies: the line is then unrestricted.
 */
export function governingRule(rules, offeringId, valueEur) {
  const applicable = rules.filter(
    (r) =>
      r.isActive !== false &&
      num(r.maxDiscountPercent) !== null &&
      (!r.offeringId || r.offeringId === offeringId) &&
      valueEur >= (num(r.minAgreementValueEur) ?? 0),
  );
  applicable.sort(
    (a, b) =>
      Number(Boolean(b.offeringId)) - Number(Boolean(a.offeringId)) ||
      (num(b.minAgreementValueEur) ?? 0) - (num(a.minAgreementValueEur) ?? 0) ||
      a.maxDiscountPercent - b.maxDiscountPercent,
  );
  return applicable[0] ?? null;
}

/**
 * Checks every line of an agreement against the discount rules. A line whose
 * discount cannot be worked out (no list price, no stored percentage) is
 * `unchecked`; data problems (a price point of another offering, …) are
 * listed in `problems` whether or not the line could be checked.
 * `members` (WorkspaceMember records) name the approvers.
 * @param {{ lines: any[], offerings: any[], pricePoints: any[], bundleItems?: any[], rules: any[], members?: any[] }} records
 * @returns {{ agreementValueEur: number, violations: Array<{ lineId: string|null, lineName: string, offeringCode: string|null,
 *   maxAllowedPercent: number, actualPercent: number, requiresApprover: string|null, approverId: string|null, ruleId: string|null, ruleName: string }>,
 *   requiresApproval: boolean, unchecked: Array<{ lineName: string, reason: string }>, problems: Array<{ lineName: string, problem: string }>,
 *   lines: ReturnType<typeof priceAgreementLines> }}
 */
export function validateAgreementDiscounts({ lines, offerings, pricePoints, bundleItems = [], rules, members = [] }) {
  const priced = priceAgreementLines({ lines, offerings, pricePoints, bundleItems });
  const value = agreementValueEur(priced);
  const membersById = byId(members);
  const violations = [];
  const unchecked = [];
  const problems = priced.filter((l) => l.problem).map((l) => ({ lineName: l.lineName, problem: l.problem }));

  for (const line of priced) {
    if (line.discountPercent === null) {
      unchecked.push({ lineName: line.lineName, reason: line.problem ?? 'no list price and no discount to check' });
      continue;
    }
    const rule = governingRule(rules, line.offeringId, value);
    if (!rule || line.discountPercent <= rule.maxDiscountPercent) continue;
    const approver = rule.approverId ? membersById.get(rule.approverId) : null;
    violations.push({
      lineId: line.lineId,
      lineName: line.lineName,
      offeringCode: line.offeringCode,
      maxAllowedPercent: rule.maxDiscountPercent,
      actualPercent: line.discountPercent,
      requiresApprover: approver ? fullName(approver.name) || approver.userEmail || approver.id : rule.approverId ?? null,
      approverId: rule.approverId ?? null,
      ruleId: rule.id ?? null,
      ruleName: rule.name ?? '',
    });
  }
  return { agreementValueEur: value, violations, requiresApproval: violations.length > 0, unchecked, problems, lines: priced };
}

// ------------------------------------------------------------------ quotes

/**
 * The price point an opportunity line is quoted at: the offering's live point
 * at `tier`, else its only live point. Null (with a reason) otherwise.
 */
export function pricePointForTier(offeringId, tier, pricePoints) {
  const candidates = pricePoints.filter((p) => p.offeringId === offeringId && p.isLegacy !== true).sort(bySortOrder);
  const atTier = tier ? candidates.find((p) => p.tier === tier) : null;
  if (atTier) return { pricePoint: atTier, problem: null };
  if (candidates.length === 1) return { pricePoint: candidates[0], problem: null };
  if (!candidates.length) return { pricePoint: null, problem: 'offering has no price points' };
  return { pricePoint: null, problem: tier ? `no ${tier} price point` : 'no tier on the opportunity or company' };
}

const unitOf = (strategyType) => (strategyType === 'PER_SEAT' ? 'seat' : 'year');

function quoteLines(priced) {
  return priced.map((l, i) => {
    const isOnRequest = l.agreedPriceEur === null;
    const listTotal = l.listPriceEur === null ? null : round2(l.listPriceEur * l.quantity);
    const rationale = l.discountRationale || (l.bundle && l.bundleDiscountPercent ? `${l.bundle} bundle −${l.bundleDiscountPercent}%` : '');
    return {
      position: i + 1,
      name: l.lineName,
      offeringCode: l.offeringCode,
      offeringName: l.offeringName,
      correlationId: l.correlationId,
      tier: l.tier,
      unit: unitOf(l.strategyType),
      quantity: l.quantity,
      listPriceEur: l.listPriceEur,
      discountPercent: l.listDiscountPercent && l.listDiscountPercent > 0 ? l.listDiscountPercent : 0,
      discountRationale: rationale,
      unitPriceEur: l.agreedPriceEur,
      listTotalEur: listTotal,
      lineTotalEur: l.lineTotalEur,
      setupFeeEur: l.setupFeeEur,
      isOnRequest,
    };
  });
}

function totalsOf(lines) {
  const priced = lines.filter((l) => !l.isOnRequest);
  const listEur = round2(priced.reduce((s, l) => s + (l.listTotalEur ?? l.lineTotalEur ?? 0), 0));
  const netEur = round2(priced.reduce((s, l) => s + (l.lineTotalEur ?? 0), 0));
  const setupFeesEur = round2(lines.reduce((s, l) => s + (l.setupFeeEur ?? 0), 0));
  return { listEur, discountEur: round2(listEur - netEur), netEur, setupFeesEur, totalEur: round2(netEur + setupFeesEur), hasOnRequestItems: lines.some((l) => l.isOnRequest) };
}

function bundlesOf(priced) {
  const codes = new Map();
  for (const l of priced) {
    if (!l.bundle) continue;
    if (!codes.has(l.bundle)) codes.set(l.bundle, []);
    codes.get(l.bundle).push(l.offeringCode);
  }
  return [...codes].map(([offeringCode, components]) => ({ offeringCode, components, discountPercent: BUNDLE_DISCOUNT * 100 }));
}

const party = (record, kind) => {
  if (!record) return null;
  if (kind === 'person') return { id: record.id, name: fullName(record.name), email: record.emails?.primaryEmail ?? null };
  return { id: record.id, name: record.name ?? '' };
};

const plusDays = (now, days) => isoDay(new Date(now.getTime() + days * 86_400_000));

/**
 * Quote payload for an agreement: its lines as agreed (agreedPriceEur, or the
 * standard price less discountPercent), with setup fees and totals. Lines that
 * ended before `now` are left out.
 * @param {{ agreement: any, lines: any[], offerings: any[], pricePoints: any[], bundleItems?: any[], company?: any, contact?: any }} records
 */
export function quoteFromAgreement({ agreement, lines, offerings, pricePoints, bundleItems = [], company = null, contact = null }, { now = new Date() } = {}) {
  const today = isoDay(now);
  const current = lines.filter((l) => !l.effectiveUntil || String(l.effectiveUntil).slice(0, 10) >= today);
  const priced = priceAgreementLines({ lines: current, offerings, pricePoints, bundleItems });
  const qLines = quoteLines(priced);
  return {
    quoteVersion: 1,
    quoteNumber: `Q-${agreement.agreementCode || agreement.id}-${today.replaceAll('-', '')}`,
    source: { kind: 'agreement', id: agreement.id, name: agreement.name ?? '' },
    issuedAt: now.toISOString(),
    validUntil: agreement.endDate ? String(agreement.endDate).slice(0, 10) : plusDays(now, QUOTE_VALID_DAYS),
    currency: 'EUR',
    client: party(company, 'company'),
    contact: party(contact, 'person'),
    tier: null,
    agreement: {
      code: agreement.agreementCode ?? null,
      type: agreement.agreementType ?? null,
      status: agreement.status ?? null,
      startDate: agreement.startDate ?? null,
      endDate: agreement.endDate ?? null,
    },
    lines: qLines,
    bundles: bundlesOf(priced),
    totals: totalsOf(qLines),
    warnings: priced.filter((l) => l.problem).map((l) => `${l.lineName}: ${l.problem}`),
  };
}

/**
 * Quote payload for an opportunity: one line per active OpportunityLine with
 * an offering, at the price point for the opportunity's tier (else the
 * company's), with the AR + DPP bundle discount when both are on it.
 * @param {{ opportunity: any, opportunityLines: any[], offerings: any[], pricePoints: any[], bundleItems?: any[], company?: any, contact?: any }} records
 */
export function quoteFromOpportunity({ opportunity, opportunityLines, offerings, pricePoints, bundleItems = [], company = null, contact = null }, { now = new Date() } = {}) {
  const tier = opportunity.tier || company?.tier || null;
  const warnings = [];
  const lines = [];
  for (const ol of opportunityLines) {
    if (ol.isActive === false) continue;
    if (!ol.offeringId) {
      warnings.push(`${ol.name || ol.id}: no offering, left out`);
      continue;
    }
    const { pricePoint, problem } = pricePointForTier(ol.offeringId, tier, pricePoints);
    if (problem) warnings.push(`${ol.name || ol.id}: ${problem}`);
    lines.push({ id: ol.id, name: ol.name, offeringId: ol.offeringId, pricePointId: pricePoint?.id ?? null, quantity: 1 });
  }
  // A missing price point is a warning above, not a "multi-price" problem below.
  const priced = priceAgreementLines({ lines, offerings, pricePoints, bundleItems }).map((l) => ({ ...l, problem: null }));
  const qLines = quoteLines(priced);
  return {
    quoteVersion: 1,
    quoteNumber: `Q-${String(opportunity.id).slice(0, 8).toUpperCase()}-${isoDay(now).replaceAll('-', '')}`,
    source: { kind: 'opportunity', id: opportunity.id, name: opportunity.name ?? '' },
    issuedAt: now.toISOString(),
    validUntil: plusDays(now, QUOTE_VALID_DAYS),
    currency: 'EUR',
    client: party(company, 'company'),
    contact: party(contact, 'person'),
    tier,
    agreement: null,
    lines: qLines,
    bundles: bundlesOf(priced),
    totals: totalsOf(qLines),
    warnings,
  };
}

// ------------------------------------------------------- preview pricing

/** Git branch for an agreement's pricing preview: `pricing-preview/<code>`, unsafe characters → '-'. */
export function previewBranch(agreementCode) {
  const slug = String(agreementCode ?? '').trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').replace(/\.{2,}/g, '.');
  if (!slug) throw new Error('agreement has no agreementCode');
  return `pricing-preview/${slug}`;
}

/**
 * pricing.json (PublicPricingV1) with an agreement's prices applied on top.
 * Each current line (inside its effective dates) sets the annual fee of:
 *   - its price point, to agreedPriceEur (or the published fee less
 *     discountPercent);
 *   - without a price point, every price point of its offering, by
 *     discountPercent (an agreed price needs a price point unless the offering
 *     has exactly one).
 * A priced point stops being on request. Lines whose offering or price point
 * is not published are skipped, with the reason. The result is validated,
 * versioned `<version>+<agreementCode>`, and keeps the source's publishedAt.
 * @returns {{ pricing: any, applied: Array<{ correlationId: string, fromEur: number|null, toEur: number }>, skipped: Array<{ lineName: string, reason: string }> }}
 */
export function applyAgreementToPricing(pricing, { agreement, lines, offerings, pricePoints }, { now = new Date() } = {}) {
  const today = isoDay(now);
  const doc = structuredClone(pricing);
  const offeringsById = byId(offerings);
  const pricePointsById = byId(pricePoints);
  const applied = [];
  const skipped = [];

  for (const line of lines) {
    const lineName = line.name || line.id;
    if (!isEffective(line.effectiveFrom, line.effectiveUntil, today)) {
      skipped.push({ lineName, reason: 'not in effect today' });
      continue;
    }
    const offering = offeringsById.get(line.offeringId);
    const published = offering && doc.offerings.find((o) => o.offeringCode === offering.offeringCode);
    if (!published) {
      skipped.push({ lineName, reason: offering ? `offering ${offering.offeringCode} is not published` : 'no offering' });
      continue;
    }
    let targets = published.pricePoints;
    if (line.pricePointId) {
      const pricePoint = pricePointsById.get(line.pricePointId);
      if (!pricePoint || pricePoint.offeringId !== offering.id) {
        skipped.push({ lineName, reason: 'price point missing or of another offering' });
        continue;
      }
      targets = published.pricePoints.filter((p) => p.correlationId === pricePoint.correlationId);
      if (!targets.length) {
        skipped.push({ lineName, reason: `price point ${pricePoint.correlationId} is not published` });
        continue;
      }
    }
    const agreed = num(line.agreedPriceEur);
    const discount = num(line.discountPercent);
    if (agreed !== null && targets.length !== 1) {
      skipped.push({ lineName, reason: 'agreed price without a price point on a multi-price offering' });
      continue;
    }
    if (agreed === null && discount === null) {
      skipped.push({ lineName, reason: 'no agreed price or discount' });
      continue;
    }
    for (const target of targets) {
      const toEur = agreed !== null ? agreed : target.annualFeeEur === null ? null : round2(target.annualFeeEur * (1 - discount / 100));
      if (toEur === null) {
        skipped.push({ lineName, reason: `${target.correlationId} is on request: a discount needs a published fee` });
        continue;
      }
      applied.push({ correlationId: target.correlationId, fromEur: target.annualFeeEur, toEur });
      target.annualFeeEur = toEur;
      target.isOnRequest = false;
    }
  }

  // publishedAt stays the source's: the same pricing + agreement gives the same file, so a re-run commits nothing.
  doc.version = `${pricing.version}+${agreement.agreementCode || agreement.id}`;
  return { pricing: PublicPricingV1.parse(doc), applied, skipped };
}

// --------------------------------------------------------- mandate pricing

const BATTERY_CATEGORIES = ['BATTERY_LI_ION', 'BATTERY_LMT'];
const hasDpp = (p) => Boolean(p.dppStatus) && p.dppStatus !== 'NONE';

/**
 * Which offerings an AR mandate implies, from the products it covers
 * (MandateProduct.category / dppStatus):
 *   AR                always: it is an AR mandate;
 *   DPP_SUBSCRIPTION  any covered product has a DPP under way (dppStatus not NONE);
 *   BATTERY_PASSPORT  a battery product with a DPP under way: the battery
 *                     passport (EU 2023/1542) is the DPP add-on for batteries.
 */
export const MANDATE_OFFERING_RULES = [
  { offeringCode: 'AR', reason: 'AR mandate', matches: () => true },
  { offeringCode: 'DPP_SUBSCRIPTION', reason: 'covered product with a DPP under way', matches: (products) => products.some(hasDpp) },
  {
    offeringCode: 'BATTERY_PASSPORT',
    reason: 'battery product with a DPP under way',
    matches: (products) => products.some((p) => hasDpp(p) && BATTERY_CATEGORIES.includes(p.category)),
  },
];

/** @returns {Array<{ offeringCode: string, reason: string }>} */
export const mandateOfferings = (products) =>
  MANDATE_OFFERING_RULES.filter((r) => r.matches(products)).map(({ offeringCode, reason }) => ({ offeringCode, reason }));

/** AR mandate annualFee (CURRENCY composite, micros) → EUR, or null when unset / not EUR. */
export function mandateFeeEur(mandate) {
  const fee = mandate?.annualFee;
  const micros = typeof fee?.amountMicros === 'string' ? Number(fee.amountMicros) : fee?.amountMicros;
  if (num(micros) === null || micros <= 0) return null;
  if (fee.currencyCode && fee.currencyCode !== 'EUR') return null;
  return round2(micros / 1e6);
}

/**
 * Which opportunity a mandate's lines belong to: the one asked for; else the
 * one its existing lines are on; else the company's only open opportunity
 * (stage not in `closedStages`).
 * @param {{ requestedId?: string|null, mandateLines?: any[], companyOpportunities?: any[], closedStages?: string[] }} input
 * @returns {{ opportunityId: string } | { error: 'ambiguous_opportunity' | 'opportunity_not_found', candidates: string[] }}
 */
export function pickOpportunity({ requestedId = null, mandateLines = [], companyOpportunities = [], closedStages = [] }) {
  if (requestedId) return { opportunityId: requestedId };
  const linked = [...new Set(mandateLines.map((l) => l.opportunityId).filter(Boolean))];
  if (linked.length === 1) return { opportunityId: linked[0] };
  if (linked.length > 1) return { error: 'ambiguous_opportunity', candidates: linked };
  const open = companyOpportunities.filter((o) => !closedStages.includes(o.stage)).map((o) => o.id);
  if (open.length === 1) return { opportunityId: open[0] };
  return { error: open.length ? 'ambiguous_opportunity' : 'opportunity_not_found', candidates: open };
}

/**
 * The OpportunityLine writes that price a mandate on an opportunity. Each
 * implied offering's value, first found of:
 *   1. AR only: the mandate's own annualFee (what the client signed);
 *   2. a binding agreement line for the offering, in effect today (agreed × quantity);
 *   3. the price list at `tier`, less the bundle discount when AR and DPP are both implied;
 *   4. none: the line is still written, with no value (on request).
 * An existing line on the opportunity for the offering (this mandate's, or
 * one not yet linked to any mandate) is updated, else one is created. Only
 * arMandateId and estimatedValueEur are ever changed on an existing line (and
 * the stream when it has none), never its stage or probability, so a second
 * run writes nothing.
 * @param {{ mandate: any, products: any[], opportunityId: string, existingLines: any[], offerings: any[], pricePoints: any[],
 *   bundleItems?: any[], agreementLines?: any[], tier?: string|null, streamId?: string|null, today: string }} input
 */
export function planMandateLines({ mandate, products, opportunityId, existingLines, offerings, pricePoints, bundleItems = [], agreementLines = [], tier = null, streamId = null, today }) {
  const byCode = new Map(offerings.map((o) => [o.offeringCode, o]));
  const wanted = mandateOfferings(products);
  const skipped = [];
  const targets = [];
  for (const w of wanted) {
    const offering = byCode.get(w.offeringCode);
    if (!offering) skipped.push({ offeringCode: w.offeringCode, reason: 'no such offering in the CRM' });
    else if (offering.isActive === false) skipped.push({ offeringCode: w.offeringCode, reason: 'offering is inactive' });
    else targets.push({ ...w, offering });
  }
  const bundled = completedBundles(targets.map((t) => t.offering.id), offerings, bundleItems);
  const fee = mandateFeeEur(mandate);

  const create = [];
  const update = [];
  const unchanged = [];
  for (const { offering, offeringCode, reason } of targets) {
    let valueEur = null;
    let priceSource = 'on request';
    const agreed = agreementLines.find((l) => l.offeringId === offering.id && isEffective(l.effectiveFrom, l.effectiveUntil, today) && num(l.agreedPriceEur) !== null);
    if (offeringCode === 'AR' && fee !== null) {
      valueEur = fee;
      priceSource = 'mandate fee';
    } else if (agreed) {
      valueEur = round2(agreed.agreedPriceEur * quantityOf(agreed));
      priceSource = 'price agreement';
    } else {
      const { pricePoint } = pricePointForTier(offering.id, tier, pricePoints);
      const list = listPriceOf(pricePoint);
      if (list !== null) {
        valueEur = round2(list * (bundled.has(offering.id) ? 1 - BUNDLE_DISCOUNT : 1));
        priceSource = bundled.has(offering.id) ? 'price list, bundle discount' : 'price list';
      }
    }

    const onOpportunity = existingLines.filter((l) => l.opportunityId === opportunityId && l.offeringId === offering.id);
    const existing = onOpportunity.find((l) => l.arMandateId === mandate.id) ?? onOpportunity.find((l) => !l.arMandateId);
    const entry = { offeringCode, reason, priceSource, estimatedValueEur: valueEur };
    if (!existing) {
      create.push({
        ...entry,
        data: {
          name: `${mandate.name || 'AR mandate'} — ${offering.name}`,
          opportunityId,
          offeringId: offering.id,
          arMandateId: mandate.id,
          estimatedValueEur: valueEur,
          isActive: true,
          ...(streamId ? { streamId } : {}),
        },
      });
      continue;
    }
    /** @type {Record<string, unknown>} */
    const patch = {};
    if (existing.arMandateId !== mandate.id) patch.arMandateId = mandate.id;
    if ((num(existing.estimatedValueEur) ?? null) !== valueEur) patch.estimatedValueEur = valueEur;
    if (streamId && !existing.streamId) patch.streamId = streamId;
    if (Object.keys(patch).length) update.push({ ...entry, id: existing.id, patch });
    else unchanged.push({ ...entry, id: existing.id });
  }
  return { create, update, unchanged, skipped };
}
