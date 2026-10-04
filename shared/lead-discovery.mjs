/**
 * A2 LinkedIn lead discovery via Apify: the actor pin, the cost estimate,
 * the guardrails, the Apify item → DiscoveredCompany mapping and the
 * discovered-company score. Shared by src/functions/run-linkedin-discovery.ts,
 * apify-webhook.ts, score-discovered-company.ts, ops/discover-leads.mjs and
 * verify-model.mjs. Plain ESM, dependency-free.
 *
 * Guardrails (plan, Feature A §6, D1):
 *   (a) company pages only: one actor, harvestapi/linkedin-company; every
 *       LinkedIn URL in and out must be a /company/ (or /showcase/) page, so a
 *       person profile (/in/…) is rejected on input and dropped on output.
 *   (b) no cookies: the actor needs no LinkedIn login and none is ever passed.
 *   (c) provenance: actor + pinned build on the run's query and on every
 *       record's description.
 *   (f) off switch: APIFY_ENABLED must be "true" or nothing runs.
 *   (g) spend cap: a run is refused when its worst case exceeds the caller's
 *       spendLimitUsd, and Apify is told the same cap (maxTotalChargeUsd).
 */
import { FREEMAIL_DOMAINS } from './icp.mjs';

export const APIFY_ACTOR = 'harvestapi/linkedin-company';
/** Pinned so the output schema cannot drift silently (latest as of 25 Sep 2026). */
export const APIFY_ACTOR_BUILD = '0.0.44';
export const APIFY_API = 'https://api.apify.com/v2';

/** Pay per event: one "Company" event per dataset item (FREE/BRONZE tier, the dearest). */
export const PRICE_PER_COMPANY_USD = 0.004;
/** "Actor Start" is $0.00005 per GB of memory; allow for 10 GB. */
export const ACTOR_START_MAX_USD = 0.0005;
/** Hard ceilings on one run, whatever the caller asks for. */
export const MAX_RESULTS_PER_RUN = 500;
export const RUN_SPEND_CEILING_USD = 5;

const round6 = (usd) => Math.round(usd * 1e6) / 1e6;

/** Worst-case cost of a run returning `maxResults` companies. */
export const estimateCostUsd = (maxResults) => round6(maxResults * PRICE_PER_COMPANY_USD + ACTOR_START_MAX_USD);

/**
 * What a finished Apify run cost. Pay-per-event runs report
 * `chargedEventCounts`, priced from the run's `pricingInfo` (a tiered price
 * counts at its dearest tier); otherwise `usageTotalUsd`; otherwise the
 * dataset size at PRICE_PER_COMPANY_USD.
 */
export function runCostUsd(run, itemCount = 0) {
  const counts = run?.chargedEventCounts;
  const events = run?.pricingInfo?.pricingPerEvent?.actorChargeEvents;
  if (counts && events && typeof counts === 'object') {
    let total = 0;
    for (const [event, count] of Object.entries(counts)) {
      const e = events[event] ?? {};
      const tiers = Object.values(e.eventTieredPricingUsd ?? {}).map((t) => t?.tieredEventPriceUsd).filter(Number.isFinite);
      const price = Number.isFinite(e.eventPriceUsd) ? e.eventPriceUsd : tiers.length ? Math.max(...tiers) : 0;
      total += (Number(count) || 0) * price;
    }
    return round6(total);
  }
  if (Number.isFinite(run?.usageTotalUsd)) return round6(run.usageTotalUsd);
  return round6(itemCount * PRICE_PER_COMPANY_USD);
}

/** Guardrail (f): the source is off unless APIFY_ENABLED is exactly "true". */
export const isApifyEnabled = (env) => env?.APIFY_ENABLED === 'true';

// ------------------------------------------------------------ LinkedIn URLs

/**
 * `https://www.linkedin.com/company/<slug>` for a LinkedIn company or
 * showcase page; null for anything else (person profiles, schools, jobs,
 * other hosts). Query, fragment and trailing path segments are dropped.
 */
/** @param {unknown} url @returns {string | null} */
export function companyPageUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  let parsed;
  try {
    parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null;
  const m = /^\/(company|showcase)\/([^/]+)/i.exec(parsed.pathname);
  if (!m) return null;
  return `https://www.linkedin.com/${m[1].toLowerCase()}/${m[2].toLowerCase()}`;
}

export const isCompanyPageUrl = (url) => companyPageUrl(url) !== null;

/** `https://<host>` of a company website (tracking query and path dropped), or null. */
/** @param {unknown} url @returns {string | null} */
export function cleanWebsite(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes('.')) return null;
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- mapping

/** Keyword → PRODUCT_CATEGORY (src/options.ts) hints from industries, specialities and description. */
export const CATEGORY_KEYWORDS = Object.freeze({
  BATTERY_LI_ION: /lithium|li-ion|li ion|lifepo4|batter(y|ies)|energy storage|锂|电池|储能/i,
  BATTERY_LMT: /e-?bikes?|electric bicycles?|e-?scooters?|light (electric|means of transport)|电动自行车|电动车/i,
  TEXTILES: /textiles?|apparel|garments?|fabrics?|纺织|服装/i,
  ELECTRONICS: /electronic|appliances?|semiconductors?|consumer electronics|电子/i,
  FURNITURE: /furniture|家具/i,
  TOYS: /\btoys?\b|玩具/i,
  MACHINERY: /machinery|industrial machines?|automation equipment|机械/i,
  MEDICAL_DEVICES: /medical|diagnostic|医疗/i,
});

export function categoriesFromText(texts) {
  const text = texts.filter((t) => typeof t === 'string').join(' \n ');
  return Object.entries(CATEGORY_KEYWORDS)
    .filter(([, re]) => re.test(text))
    .map(([category]) => category);
}

const strings = (value) =>
  (Array.isArray(value) ? value : [])
    .map((v) => (typeof v === 'string' ? v : v?.name ?? v?.localizedName ?? null))
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => v.trim());

/** LinkedIn's employee bands, for items that carry a count but no range. */
const BANDS = [[1, 10], [11, 50], [51, 200], [201, 500], [501, 1000], [1001, 5000], [5001, 10000], [10001, null]];
const band = (start, end) => (end ? `${start}-${end}` : `${start}+`);

export function companySizeText(item) {
  const range = item?.employeeCountRange;
  if (range && Number.isFinite(range.start)) return band(range.start, Number.isFinite(range.end) ? range.end : null);
  const count = item?.employeeCount;
  if (!Number.isFinite(count) || count < 1) return '';
  const [start, end] = BANDS.find(([s, e]) => count >= s && (e === null || count <= e));
  return band(start, end);
}

export function headquartersText(item) {
  const locations = Array.isArray(item?.locations) ? item.locations : [];
  const hq = locations.find((l) => l?.headquarter) ?? locations[0];
  if (!hq) return '';
  const p = hq.parsed ?? {};
  const parts = [p.city ?? hq.city, p.state ?? hq.geographicArea, p.country ?? hq.country].filter((s) => typeof s === 'string' && s.trim());
  return [...new Set(parts.map((s) => s.trim()))].join(', ');
}

/** @param {string | null} [runId] */
export const provenanceLine = (runId) =>
  `_Source: LinkedIn company page via Apify ${APIFY_ACTOR} build ${APIFY_ACTOR_BUILD}${runId ? `, run ${runId}` : ''}._`;

/**
 * @typedef {{ companyName: string, website: string, linkedinUrl: string, industry: string, companySize: string,
 *             headquarters: string, productCategories: string[], description: string }} DiscoveredCompanyFields
 */

/**
 * One Apify dataset item → DiscoveredCompany fields (REST shape, minus
 * discoveryRunId / isDuplicate / score), or why it was dropped:
 *   not_company_page  no LinkedIn company URL (guardrail a: never a person)
 *   no_website        the plan's rule: no website, no lead
 *
 * @param {any} item
 * @param {string | null} [runId]
 * @returns {{ ok: true, record: DiscoveredCompanyFields } | { ok: false, reason: 'not_company_page' | 'no_website' }}
 */
export function mapApifyItem(item, runId = null) {
  const linkedinUrl = companyPageUrl(item?.linkedinUrl ?? item?.url ?? '');
  if (!linkedinUrl) return { ok: false, reason: 'not_company_page' };
  const website = cleanWebsite(item?.website ?? '');
  if (!website) return { ok: false, reason: 'no_website' };

  const industries = strings(item.industries);
  const specialities = strings(item.specialities ?? item.specialties);
  const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : linkedinUrl.split('/').pop();
  const description = [
    typeof item.tagline === 'string' && item.tagline.trim() ? `**${item.tagline.trim()}**` : null,
    typeof item.description === 'string' && item.description.trim() ? item.description.trim() : null,
    specialities.length ? `Specialities: ${specialities.join(', ')}` : null,
    provenanceLine(runId),
  ].filter(Boolean);

  return {
    ok: true,
    record: {
      companyName: name.slice(0, 200),
      website,
      linkedinUrl,
      industry: industries.join(', '),
      companySize: companySizeText(item),
      headquarters: headquartersText(item),
      productCategories: categoriesFromText([...industries, ...specialities, item.tagline, item.description, name]),
      description: description.join('\n\n'),
    },
  };
}

// ---------------------------------------------------------------- scoring

/**
 * Discovered-company score (0–100), deterministic like shared/scoring.mjs:
 *
 *   product category   up to 40, the best-matching category (below)
 *   web presence       10 for a website AND a LinkedIn page
 *   e-mail domains     15 for at least one non-freemail domain
 *   company size       11–50 → 5, 51–200 → 10, 201+ → 15
 *   headquarters       10 in (mainland) China
 *   industry           10 for Electronics / Medical / Batteries / Textiles
 */
/** Keyed by PRODUCT_CATEGORY value (src/options.ts); verify-model.mjs checks the keys. */
export const CATEGORY_POINTS = Object.freeze({
  BATTERY_LI_ION: 40,
  MEDICAL_DEVICES: 40,
  BATTERY_LMT: 30,
  ELECTRONICS: 25,
  MACHINERY: 20,
  TEXTILES: 15,
  FURNITURE: 15,
  TOYS: 15,
  OTHER: 5,
});
export const WEB_PRESENCE_POINTS = 10;
export const EMAIL_DOMAIN_POINTS = 15;
export const HQ_CHINA_POINTS = 10;
export const INDUSTRY_POINTS = 10;
export const INDUSTRY_MATCH = /electronic|medical|batter(y|ies)|textile/i;
const CHINA = /\b(china|prc)\b|中国/i;

const filled = (value) => typeof value === 'string' && value.trim() !== '';
const FREEMAIL = new Set(FREEMAIL_DOMAINS);

/** Company e-mail domains from the comma-separated field, freemail dropped. */
export const companyEmailDomains = (text) =>
  String(text ?? '')
    .split(/[,;\s]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter((d) => d.includes('.') && !FREEMAIL.has(d));

export function sizePoints(companySize) {
  const start = Number(/\d[\d,]*/.exec(String(companySize ?? ''))?.[0]?.replace(/,/g, '') ?? NaN);
  if (!Number.isFinite(start)) return 0;
  if (start >= 201) return 15;
  if (start >= 51) return 10;
  if (start >= 11) return 5;
  return 0;
}

/**
 * @param {{ productCategories?: string[] | null, website?: string | null, linkedinUrl?: string | null,
 *           emailDomains?: string | null, companySize?: string | null, headquarters?: string | null,
 *           industry?: string | null }} c
 * @returns {{ score: number, breakdown: Array<{ rule: string, points: number, max: number, detail: string }> }}
 */
export function scoreDiscoveredCompany(c) {
  const best = (c.productCategories ?? []).reduce(
    (top, category) => ((CATEGORY_POINTS[category] ?? 0) > top.points ? { category, points: CATEGORY_POINTS[category] } : top),
    { category: null, points: 0 },
  );
  const web = filled(c.website) && filled(c.linkedinUrl);
  const domains = companyEmailDomains(c.emailDomains);
  const size = sizePoints(c.companySize);
  const china = filled(c.headquarters) && CHINA.test(c.headquarters);
  const industry = filled(c.industry) && INDUSTRY_MATCH.test(c.industry);

  const breakdown = [
    {
      rule: 'Product category',
      points: best.points,
      max: Math.max(...Object.values(CATEGORY_POINTS)),
      detail: best.category ? `best match: ${best.category}` : 'no Integra category matched',
    },
    {
      rule: 'Website + LinkedIn',
      points: web ? WEB_PRESENCE_POINTS : 0,
      max: WEB_PRESENCE_POINTS,
      detail: web ? 'both' : filled(c.website) ? 'no LinkedIn page' : 'no website',
    },
    {
      rule: 'E-mail domains',
      points: domains.length ? EMAIL_DOMAIN_POINTS : 0,
      max: EMAIL_DOMAIN_POINTS,
      detail: domains.length ? domains.join(', ') : 'none known (freemail does not count)',
    },
    {
      rule: 'Company size',
      points: size,
      max: 15,
      detail: filled(c.companySize) ? `${c.companySize.trim()} employees` : 'unknown',
    },
    {
      rule: 'Headquarters in China',
      points: china ? HQ_CHINA_POINTS : 0,
      max: HQ_CHINA_POINTS,
      detail: filled(c.headquarters) ? c.headquarters.trim() : 'unknown',
    },
    {
      rule: 'Industry',
      points: industry ? INDUSTRY_POINTS : 0,
      max: INDUSTRY_POINTS,
      detail: filled(c.industry) ? c.industry.trim() : 'unknown',
    },
  ];
  const total = breakdown.reduce((sum, item) => sum + item.points, 0);
  return { score: Math.max(0, Math.min(100, total)), breakdown };
}

/** Markdown for DiscoveredCompany.scoreBreakdown. */
export function breakdownMarkdown({ score, breakdown }) {
  const lines = breakdown.map((b) => `- **${b.rule}:** ${b.points}/${b.max} — ${b.detail}`);
  return `**Score ${score}** (discovery rules v1)\n\n${lines.join('\n')}`;
}
