/**
 * C1 pricing engine. Single source of truth for:
 *   - src/options.ts                  (Offering / PricePoint select options)
 *   - ops/seed-pricing.mjs            (the canonical offerings, price points, bundle items)
 *   - ops/publish-pricing.mjs         (CRM records → public pricing.json, validated)
 *   - src/front-components/PricingDisplay.tsx  (CRM preview of the public display)
 *   - shared/stripe-sync.mjs          (liveness, display rules)
 *   - verify-model.mjs                (D3 display rules, seed shape, transform, schema)
 *
 * Amounts are always EUR (`annualFeeEur`, `setupFeeEur`). The currency is the
 * invoicing currency and converts nothing: PricePoint.currencyCode in the CRM
 * (Twenty reserves `currency`), `currency` in pricing.json. Plain ESM and
 * dependency-free (the publish workflow runs without `npm ci`), so the
 * PublicPricingV1 schema below is a small zod-style validator, not zod.
 */

export const STRATEGY_TYPES = [
  { value: 'FLAT', label: 'Flat · 固定价', color: 'green' },
  { value: 'TIERED', label: 'Tiered · 分级', color: 'blue' },
  { value: 'BUNDLE', label: 'Bundle · 组合', color: 'turquoise' },
  { value: 'PER_SEAT', label: 'Per seat · 按席位', color: 'sky' },
  { value: 'ADD_ON', label: 'Add-on · 附加', color: 'purple' },
  { value: 'QUOTE_ONLY', label: 'Quote only · 仅报价', color: 'orange' },
  { value: 'CUSTOM', label: 'Custom · 定制', color: 'gray' },
];

/** How the public website lays out an offering's price points. */
export const DISPLAY_FORMATS = [
  { value: 'PRICE_CARD', label: 'Price card · 价格卡', color: 'green' },
  { value: 'TIER_TABLE', label: 'Tier table · 分级表', color: 'blue' },
  { value: 'BUNDLE_COMPARISON', label: 'Bundle comparison · 组合对比', color: 'turquoise' },
  { value: 'SEAT_PRICING', label: 'Seat pricing · 席位定价', color: 'sky' },
  { value: 'ADD_ON_LIST', label: 'Add-on list · 附加列表', color: 'purple' },
  { value: 'CONTACT_CTA', label: 'Contact CTA · 联系我们', color: 'orange' },
  { value: 'HIDDEN', label: 'Hidden · 隐藏', color: 'gray' },
];

/**
 * D3 decision, part 1: the default display format for each strategy type. The
 * seed applies it; staff may override displayFormat per offering, and the
 * publisher falls back to it when displayFormat is empty.
 */
export const DISPLAY_FORMAT_FOR_TYPE = {
  FLAT: 'PRICE_CARD',
  TIERED: 'TIER_TABLE',
  BUNDLE: 'BUNDLE_COMPARISON',
  PER_SEAT: 'SEAT_PRICING',
  ADD_ON: 'ADD_ON_LIST',
  QUOTE_ONLY: 'CONTACT_CTA',
  CUSTOM: 'HIDDEN',
};

/** Formats that never show an amount: the website offers a contact CTA or nothing. */
export const AMOUNT_FREE_FORMATS = ['CONTACT_CTA', 'HIDDEN'];

/** Strategy types whose prices are quoted, never published. */
export const QUOTED_TYPES = ['QUOTE_ONLY'];

/** PricePoint.tier values: the same as the TIER select in src/options.ts (Company / Opportunity). */
export const PRICE_TIERS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'BOOST', label: 'Boost' },
  { value: 'BUILDER', label: 'Builder' },
  { value: 'BOSS', label: 'Boss' },
];

export const CURRENCIES = [
  { value: 'EUR', label: 'EUR €', color: 'blue' },
  { value: 'CNY', label: 'CNY ¥', color: 'red' },
  { value: 'USD', label: 'USD $', color: 'green' },
  { value: 'GBP', label: 'GBP £', color: 'purple' },
];

export const DEFAULT_CURRENCY = 'EUR';

export const tierLabel = (tier) => PRICE_TIERS.find((t) => t.value === tier)?.label ?? null;

export const displayFormatFor = (offering) =>
  offering.displayFormat || DISPLAY_FORMAT_FOR_TYPE[offering.strategyType] || 'HIDDEN';

/**
 * D3 decision, part 2: "from €…" is shown for every ADD_ON and for any
 * offering with optional extras, whatever its fromPrefix checkbox says.
 */
export const requiresFromPrefix = (offering) => offering.strategyType === 'ADD_ON' || offering.hasOptionalExtras === true;
export const fromPrefixFor = (offering) => offering.fromPrefix === true || requiresFromPrefix(offering);

/** True when the offering's amounts must not leave the CRM. */
export const hidesAmounts = (offering) => AMOUNT_FREE_FORMATS.includes(displayFormatFor(offering)) || QUOTED_TYPES.includes(offering.strategyType);

// --------------------------------------------------------------- seed data

/** AR+DPP bundle = DPP + AR at the same tier, less this discount (verify-model.mjs checks it). */
export const BUNDLE_DISCOUNT = 0.15;

const PRICING_YEAR = 2026;
const TIER_ORDER = PRICE_TIERS.map((t) => t.value);

const pricePoint = (correlationId, name, offeringSortOrder, i, extra) => ({
  correlationId,
  name,
  tier: null,
  annualFeeEur: null,
  setupFeeEur: null,
  currencyCode: DEFAULT_CURRENCY,
  isHighlighted: false,
  isOnRequest: false,
  isLegacy: false,
  description: '',
  ...extra,
  // Offering-major so the flat Price Points table groups by offering.
  sortOrder: offeringSortOrder * 10 + i,
});

/** One tier ladder: fees in tier order, null = Boss (on request). */
const ladder = ({ prefix, label, fees, offeringSortOrder }) =>
  TIER_ORDER.map((tier, i) =>
    pricePoint(`${prefix}-${tier.toLowerCase()}-${PRICING_YEAR}`, `${label} ${tierLabel(tier)}`, offeringSortOrder, i, {
      tier,
      annualFeeEur: fees[i],
      isOnRequest: fees[i] === null,
    }),
  );

/** A single price: one price point, no tier. `null` fee = on request. */
const single = ({ correlationId, label, fee, offeringSortOrder, ...extra }) => [
  pricePoint(correlationId, label, offeringSortOrder, 0, { annualFeeEur: fee, isOnRequest: fee === null, ...extra }),
];

/**
 * The canonical offerings and their price points. `offeringCode` keys the
 * offering, `correlationId` each price point (Stripe lookup key, public id);
 * neither may change once seeded.
 */
export const OFFERINGS = [
  {
    offeringCode: 'DPP_SUBSCRIPTION',
    name: 'DPP — Digital Product Passport',
    strategyType: 'TIERED',
    description: 'Digital product passport service, annual subscription by tier.',
    pricePoints: ladder({ prefix: 'dpp', label: 'DPP', fees: [950, 2500, 6000, null], offeringSortOrder: 0 }),
  },
  {
    offeringCode: 'AR',
    name: 'AR — EU Authorised Representative',
    strategyType: 'TIERED',
    description: 'EU authorised representative mandate, annual fee by tier.',
    pricePoints: ladder({ prefix: 'ar', label: 'AR Mandate', fees: [250, 1200, 3000, null], offeringSortOrder: 1 }),
  },
  {
    offeringCode: 'AR_DPP_BUNDLE',
    name: 'AR + DPP Bundle',
    strategyType: 'BUNDLE',
    description: 'DPP and EU authorised representative together, 15% below the two tiers bought separately.',
    pricePoints: ladder({ prefix: 'bundle', label: 'Bundle', fees: [1020, 3145, 7650, null], offeringSortOrder: 2 }),
  },
  {
    offeringCode: 'EPREL_REGISTRATION',
    name: 'EPREL Registration',
    strategyType: 'FLAT',
    description: 'EPREL product registration, single fee.',
    pricePoints: single({ correlationId: `eprel-registration-${PRICING_YEAR}`, label: 'EPREL Registration', fee: 500, offeringSortOrder: 3 }),
  },
  {
    offeringCode: 'BATTERY_PASSPORT',
    name: 'Battery Passport',
    strategyType: 'ADD_ON',
    description: 'Battery passport add-on, annual fee.',
    pricePoints: single({ correlationId: `battery-passport-${PRICING_YEAR}`, label: 'Battery Passport', fee: 1500, offeringSortOrder: 4 }),
  },
  {
    offeringCode: 'TRAINING_LIVE',
    name: 'Training — Live',
    strategyType: 'PER_SEAT',
    description: 'Live training, price per seat.',
    pricePoints: single({ correlationId: `training-live-${PRICING_YEAR}`, label: 'Training Live (per seat)', fee: 150, offeringSortOrder: 5 }),
  },
  {
    offeringCode: 'TRAINING_RECORDED',
    name: 'Training — Recorded',
    strategyType: 'PER_SEAT',
    description: 'Recorded training, price per seat.',
    pricePoints: single({ correlationId: `training-recorded-${PRICING_YEAR}`, label: 'Training Recorded (per seat)', fee: 89, offeringSortOrder: 6 }),
  },
  {
    offeringCode: 'BOSS',
    name: 'Boss',
    strategyType: 'QUOTE_ONLY',
    description: 'Custom scope, quoted on request.',
    pricePoints: single({ correlationId: `boss-${PRICING_YEAR}`, label: 'Boss', fee: null, offeringSortOrder: 7, tier: 'BOSS' }),
  },
].map((o, i) => ({
  features: [],
  hasOptionalExtras: false,
  ...o,
  displayFormat: DISPLAY_FORMAT_FOR_TYPE[o.strategyType],
  fromPrefix: o.strategyType === 'ADD_ON',
  isActive: true,
  validFrom: `${PRICING_YEAR}-01-01`,
  validUntil: null,
  // Position in the list; the price points' sortOrder is offering-major on the same index.
  sortOrder: i,
}));

/** Bundle components, by offeringCode. */
export const BUNDLE_ITEMS = [
  { bundle: 'AR_DPP_BUNDLE', component: 'DPP_SUBSCRIPTION', included: true, sortOrder: 0 },
  { bundle: 'AR_DPP_BUNDLE', component: 'AR', included: true, sortOrder: 1 },
];

export const bundleItemName = (bundle, component) => `${bundle.name} — ${component.name}`;

/**
 * Why a BundleItem is invalid, or null: the bundle must be a BUNDLE
 * offering, the component a non-BUNDLE one (no nested bundles).
 */
export function bundleItemProblem(bundle, component) {
  if (!bundle || !component) return 'bundle or component missing';
  if (bundle.strategyType !== 'BUNDLE') return `bundle ${bundle.offeringCode} is ${bundle.strategyType}, not BUNDLE`;
  if (component.strategyType === 'BUNDLE') return `component ${component.offeringCode} is itself a BUNDLE`;
  return null;
}

// ----------------------------------------------- PublicPricingV1 schema

/** Minimal zod-style combinators: each schema has `check(value, path, issues)`; `safeParse` / `parse` wrap it. */
const schema = (check) => ({
  check,
  safeParse(value) {
    const issues = [];
    check(value, '', issues);
    return issues.length ? { success: false, issues } : { success: true, data: value };
  },
  parse(value) {
    const result = this.safeParse(value);
    if (!result.success) throw new Error(`invalid pricing.json: ${result.issues.join('; ')}`);
    return result.data;
  },
});
const prim = (type) => schema((v, path, issues) => typeof v !== type && issues.push(`${path || '$'}: expected ${type}`));
const enumOf = (values) => schema((v, path, issues) => values.includes(v) || issues.push(`${path || '$'}: expected one of ${values.join('/')}`));
const nullable = (inner) => schema((v, path, issues) => v === null || inner.check(v, path, issues));
const arrayOf = (inner) =>
  schema((v, path, issues) => {
    if (!Array.isArray(v)) return issues.push(`${path || '$'}: expected array`);
    v.forEach((item, i) => inner.check(item, `${path}[${i}]`, issues));
  });
/** Strict: exactly these keys, in any order — an unknown key could be an internal field leaking. */
const objectOf = (shape) =>
  schema((v, path, issues) => {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return issues.push(`${path || '$'}: expected object`);
    for (const [key, inner] of Object.entries(shape)) inner.check(v[key], `${path}.${key}`, issues);
    for (const key of Object.keys(v)) if (!(key in shape)) issues.push(`${path}.${key}: unexpected key`);
  });

const isoDateTime = schema((v, path, issues) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(v) || Number.isNaN(Date.parse(v))) {
    issues.push(`${path || '$'}: expected ISO8601 UTC datetime`);
  }
});
const finiteNumber = schema((v, path, issues) => (typeof v === 'number' && Number.isFinite(v)) || issues.push(`${path || '$'}: expected finite number`));

const strategyTypes = STRATEGY_TYPES.map((t) => t.value);
const displayFormats = DISPLAY_FORMATS.map((f) => f.value);
const tiers = PRICE_TIERS.map((t) => t.value);
const currencies = CURRENCIES.map((c) => c.value);

export const PublicPricePointV1 = objectOf({
  correlationId: prim('string'),
  tier: nullable(enumOf(tiers)),
  annualFeeEur: nullable(finiteNumber),
  currency: enumOf(currencies),
  isOnRequest: prim('boolean'),
  isHighlighted: prim('boolean'),
  description: prim('string'),
});

export const PublicOfferingV1 = objectOf({
  offeringCode: prim('string'),
  name: prim('string'),
  strategyType: enumOf(strategyTypes),
  displayFormat: enumOf(displayFormats),
  fromPrefix: prim('boolean'),
  description: prim('string'),
  features: arrayOf(prim('string')),
  pricePoints: arrayOf(PublicPricePointV1),
  bundleOf: arrayOf(prim('string')),
});

/** The pricing.json document. */
export const PublicPricingV1 = schema((v, path, issues) => {
  objectOf({ publishedAt: isoDateTime, version: prim('string'), offerings: arrayOf(PublicOfferingV1) }).check(v, path, issues);
  if (issues.length || !Array.isArray(v?.offerings)) return;
  // Cross-field rules: an on-request price point carries no amount, and a bundle only lists published offerings.
  const codes = new Set(v.offerings.map((o) => o.offeringCode));
  if (codes.size !== v.offerings.length) issues.push('$.offerings: duplicate offeringCode');
  v.offerings.forEach((o, i) => {
    o.pricePoints.forEach((p, j) => {
      if (p.isOnRequest !== (p.annualFeeEur === null)) issues.push(`$.offerings[${i}].pricePoints[${j}]: isOnRequest must match a null annualFeeEur`);
    });
    for (const code of o.bundleOf) if (!codes.has(code)) issues.push(`$.offerings[${i}].bundleOf: ${code} is not a published offering`);
    if (o.bundleOf.length && o.strategyType !== 'BUNDLE') issues.push(`$.offerings[${i}].bundleOf: only a BUNDLE offering has components`);
  });
});

// ------------------------------------------------- public pricing.json

const isoDay = (d) => d.toISOString().slice(0, 10);

/** Active, and `today` (YYYY-MM-DD) within validFrom..validUntil inclusive. Dates may be null. */
export const isLive = (offering, today) =>
  offering.isActive === true &&
  (!offering.validFrom || offering.validFrom.slice(0, 10) <= today) &&
  (!offering.validUntil || offering.validUntil.slice(0, 10) >= today);

const markdownOf = (richText) => (typeof richText === 'string' ? richText : richText?.markdown ?? '').trim();
const bySortOrder = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

/** Rich-text bullets → plain strings: one feature per non-empty line, list markers stripped. */
export const featuresOf = (richText) =>
  markdownOf(richText)
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);

/** `YYYY-MM-DD.N`: N counts the day's publications, so versions sort and never repeat. */
export function nextVersion(publications, now) {
  const day = isoDay(now);
  const todays = publications.filter((p) => typeof p.version === 'string' && p.version.startsWith(`${day}.`)).length;
  return `${day}.${todays + 1}`;
}

/** Bundle items that break the rules (bundle must be BUNDLE, component not), for the publisher to warn about. */
export function invalidBundleItems(offerings, bundleItems) {
  const byId = new Map(offerings.map((o) => [o.id, o]));
  return bundleItems
    .map((item) => ({ item, problem: bundleItemProblem(byId.get(item.bundleId), byId.get(item.componentId)) }))
    .filter((x) => x.problem);
}

/**
 * CRM records (REST shape: Offering with `id`, PricePoint with `offeringId`,
 * BundleItem with `bundleId` / `componentId`) → the PublicPricingV1 document,
 * validated. The filter is the point:
 *   - only live offerings (isActive, inside the validity window);
 *   - isLegacy price points are skipped entirely;
 *   - only public fields — no CRM ids, no setup fees, no sort orders;
 *   - an on-request price point, and every price point of a CONTACT_CTA /
 *     HIDDEN / QUOTE_ONLY offering, carries no amount, so a quoted price can
 *     never leak to the website;
 *   - fromPrefix follows D3 (ADD_ON / hasOptionalExtras always "from").
 * @param {{ offerings: any[], pricePoints: any[], bundleItems?: any[] }} records
 * @param {{ now?: Date, version: string }} options
 */
export function buildPublicPricing({ offerings, pricePoints, bundleItems = [] }, { now = new Date(), version }) {
  const today = isoDay(now);
  const live = offerings.filter((o) => isLive(o, today)).sort(bySortOrder);
  const liveById = new Map(live.map((o) => [o.id, o]));

  const doc = {
    publishedAt: now.toISOString(),
    version,
    offerings: live.map((o) => {
      const hidden = hidesAmounts(o);
      const isBundle = o.strategyType === 'BUNDLE';
      return {
        offeringCode: o.offeringCode,
        name: o.name,
        strategyType: o.strategyType,
        displayFormat: displayFormatFor(o),
        fromPrefix: fromPrefixFor(o),
        description: markdownOf(o.description),
        features: featuresOf(o.features),
        pricePoints: pricePoints
          .filter((p) => p.offeringId === o.id && p.isLegacy !== true)
          .sort(bySortOrder)
          .map((p) => {
            const isOnRequest = hidden || p.isOnRequest === true || p.annualFeeEur == null;
            return {
              correlationId: p.correlationId,
              tier: p.tier ?? null,
              annualFeeEur: isOnRequest ? null : p.annualFeeEur,
              currency: p.currencyCode || DEFAULT_CURRENCY,
              isOnRequest,
              isHighlighted: p.isHighlighted === true,
              description: p.description ?? '',
            };
          }),
        bundleOf: !isBundle
          ? []
          : bundleItems
              .filter((b) => b.bundleId === o.id && b.included !== false)
              .sort(bySortOrder)
              .map((b) => liveById.get(b.componentId))
              .filter((component) => component && !bundleItemProblem(o, component))
              .map((component) => component.offeringCode),
      };
    }),
  };
  return PublicPricingV1.parse(doc);
}

// ------------------------------------------------------------- display copy

export const ON_REQUEST = 'On request';

const eur = (decimals) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const EUR_WHOLE = eur(0);
const EUR_CENTS = eur(2);

/** "€2,500" for whole euros, "€99.50" otherwise. */
export const formatEur = (amount) => (Number.isInteger(amount) ? EUR_WHOLE : EUR_CENTS).format(amount);

/** One price point's price: "€950/yr", "€150/seat" for a PER_SEAT offering, or "On request". */
export const pricePointLabel = (pricePoint, strategyType) =>
  pricePoint.isOnRequest || pricePoint.annualFeeEur == null
    ? ON_REQUEST
    : `${formatEur(pricePoint.annualFeeEur)}${strategyType === 'PER_SEAT' ? '/seat' : '/yr'}`;

/**
 * The one-line headline for a public offering (pricing.json shape):
 *   PRICE_CARD / ADD_ON_LIST → "€500/yr" (sum of the priced points), or
 *                              "from €500/yr" (cheapest) when fromPrefix is set
 *   TIER_TABLE / BUNDLE_COMPARISON / SEAT_PRICING → null (render the table instead)
 *   CONTACT_CTA / HIDDEN → "On request"
 * Falls back to "On request" when nothing is priced.
 */
export function offeringHeadline(offering) {
  const priced = offering.pricePoints.filter((p) => !p.isOnRequest && p.annualFeeEur != null).map((p) => p.annualFeeEur);
  switch (offering.displayFormat) {
    case 'TIER_TABLE':
    case 'BUNDLE_COMPARISON':
    case 'SEAT_PRICING':
      return null;
    case 'PRICE_CARD':
    case 'ADD_ON_LIST':
      if (!priced.length) return ON_REQUEST;
      return offering.fromPrefix ? `from ${formatEur(Math.min(...priced))}/yr` : `${formatEur(priced.reduce((a, b) => a + b, 0))}/yr`;
    default:
      return ON_REQUEST;
  }
}
