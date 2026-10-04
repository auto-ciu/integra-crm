/**
 * A2 lead import + enrichment rules: the de-duplication keys, the CSV row →
 * DiscoveredCompany mapping, the enrichment / Safety Gate budgets and parsing,
 * and the GDPR Art.14 notice. Shared by src/functions/import-leads-csv.ts,
 * enrich-discovered-company.ts, check-safety-gate.ts, send-gdpr-art14.ts, the
 * ops scripts and verify-model.mjs. Plain ESM, dependency-free.
 */
import { createHash } from 'node:crypto';

import { UNKNOWN_MODEL_PRICE } from './digest.mjs';
import { CATEGORY_POINTS, cleanWebsite, companyPageUrl } from './lead-discovery.mjs';

// ------------------------------------------------------------------ budgets

/** Plan: ~$0.10 per enrichment; the hard cap is $0.50. */
export const ENRICHMENT_BUDGET_USD = 0.5;
export const SAFETY_CHECK_BUDGET_USD = 0.3;
export const ENRICHMENT_MAX_OUTPUT_TOKENS = 2_000;
export const SAFETY_MAX_OUTPUT_TOKENS = 3_000;
/** Each web search is billed $10 per 1,000 on top of the tokens. */
export const WEB_SEARCH_USD = 0.01;
export const SAFETY_MAX_SEARCHES = 3;
export const MAX_IMPORT_ROWS = 500;

const round6 = (usd) => Math.round(usd * 1e6) / 1e6;

/** Worst case of one call at the dearest fallback price: prompt plus a full max_tokens (plus searches). */
export const worstCaseUsd = (inputTokens, maxOutputTokens, searches = 0) =>
  round6((inputTokens * UNKNOWN_MODEL_PRICE.input + maxOutputTokens * UNKNOWN_MODEL_PRICE.output) / 1e6 + searches * WEB_SEARCH_USD);

// ----------------------------------------------------------- de-duplication

const text = (value) => (typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '');

/** Lower-case, no punctuation or company suffixes: "Shenzhen ABC Co., Ltd." → "shenzhen abc". */
export const normaliseName = (name) =>
  text(name)
    .toLowerCase()
    .replace(/\b(co|company|corp|corporation|inc|incorporated|ltd|limited|llc|gmbh|plc)\b\.?/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

export const normaliseLocation = (hq) =>
  text(hq)
    .toLowerCase()
    .replace(/\b(china|prc|province|city)\b|中国|省|市/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Same name and same headquarters (both present) = the same company, as far as a CSV can tell. */
/** @param {{ companyName?: string, headquarters?: string }} a @param {{ companyName?: string, headquarters?: string }} b */
export const likelySameCompany = (a, b) =>
  normaliseName(a.companyName) !== '' &&
  normaliseName(a.companyName) === normaliseName(b.companyName) &&
  normaliseLocation(a.headquarters) !== '' &&
  normaliseLocation(a.headquarters) === normaliseLocation(b.headquarters);

/** The normalised LinkedIn company page, or `name:<hash of company name + headquarters>`. */
/** @param {{ linkedinUrl?: string, companyName?: string, headquarters?: string }} c */
export function dedupeKey({ linkedinUrl, companyName, headquarters }) {
  const page = companyPageUrl(linkedinUrl);
  if (page) return page;
  const digest = createHash('sha256').update(`${normaliseName(companyName)}|${normaliseLocation(headquarters)}`).digest('hex');
  return `name:${digest.slice(0, 24)}`;
}

// ------------------------------------------------------------- row mapping

/** CSV header (any case, spaces or underscores) → DiscoveredCompany field. */
const ALIASES = {
  companyname: 'companyName', company: 'companyName', name: 'companyName',
  companynamezh: 'companyNameZh', chinesename: 'companyNameZh',
  website: 'website', url: 'website', domain: 'website',
  linkedinurl: 'linkedinUrl', linkedin: 'linkedinUrl',
  headquarters: 'headquarters', hq: 'headquarters', city: 'headquarters', location: 'headquarters',
  province: 'province',
  industry: 'industry',
  companysize: 'companySize', employees: 'companySize', size: 'companySize',
  contactname: 'contactName', contact: 'contactName',
  contacttitle: 'contactTitle', title: 'contactTitle', jobtitle: 'contactTitle',
  contactemail: 'contactEmail', email: 'contactEmail',
  description: 'description',
};

/**
 * One import row → DiscoveredCompany fields. Only a company name is required;
 * a LinkedIn URL must be a company page (a person profile is rejected, as in
 * A1), a website must parse, an e-mail must look like one.
 *
 * @returns {{ ok: true, record: Record<string, string> } | { ok: false, reason: string }}
 */
export function mapImportRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return { ok: false, reason: 'row is not an object' };
  const fields = {};
  for (const [key, value] of Object.entries(row)) {
    const field = ALIASES[key.toLowerCase().replace(/[^a-z]/g, '')];
    if (field && text(value) && !fields[field]) fields[field] = text(value);
  }
  if (!fields.companyName) return { ok: false, reason: 'missing company name' };

  const record = { ...fields, companyName: fields.companyName.slice(0, 200) };
  if (fields.linkedinUrl) {
    const page = companyPageUrl(fields.linkedinUrl);
    if (!page) return { ok: false, reason: `not a LinkedIn company page: ${fields.linkedinUrl.slice(0, 80)}` };
    record.linkedinUrl = page;
  }
  if (fields.website) {
    const site = cleanWebsite(fields.website);
    if (!site) return { ok: false, reason: `invalid website: ${fields.website.slice(0, 80)}` };
    record.website = site;
  }
  if (fields.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.contactEmail)) {
    return { ok: false, reason: `invalid e-mail: ${fields.contactEmail.slice(0, 80)}` };
  }
  return { ok: true, record };
}

// ----------------------------------------------------------- enrichment bits

export const EMPLOYEE_BANDS = Object.freeze(['MICRO_1_10', 'SMALL_11_50', 'MEDIUM_51_200', 'LARGE_201_PLUS']);

/** Employee count → EMPLOYEE_BAND value (src/options.ts), or null if not a positive number. */
export function employeeBand(count) {
  if (!Number.isFinite(count) || count < 1) return null;
  if (count <= 10) return EMPLOYEE_BANDS[0];
  if (count <= 50) return EMPLOYEE_BANDS[1];
  if (count <= 200) return EMPLOYEE_BANDS[2];
  return EMPLOYEE_BANDS[3];
}

export const PRODUCT_CATEGORY_VALUES = Object.freeze(Object.keys(CATEGORY_POINTS));

/** Visible text of an HTML page, whitespace collapsed, cut at `maxChars`. */
export function htmlToText(html, maxChars = 40_000) {
  return String(html ?? '')
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

/** A host that must never be fetched on behalf of a CRM record (loopback, private, link-local). */
export function isPrivateHost(host) {
  const h = String(host ?? '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true;
  if (/^(::1?|f[cd][0-9a-f]{2}:|fe80:|::ffff:)/.test(h)) return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

/** The JSON object in a model answer (bare, or inside a ```json fence); null if none parses. */
export function extractJson(answer) {
  const body = /```(?:json)?\s*([\s\S]*?)```/.exec(answer)?.[1] ?? answer;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- ICP tier

export const SCORE_MODEL = 'rules';
export const SCORE_RUBRIC_VERSION = 'a2-rules-v1';
export const ICP_TIER_HOT_MIN = 70;
export const ICP_TIER_WARM_MIN = 40;

/** ICP tier (src/options.ts ICP_TIER) for a 0–100 score. */
export const icpTier = (score) => (score >= ICP_TIER_HOT_MIN ? 'TIER_1_HOT' : score >= ICP_TIER_WARM_MIN ? 'TIER_2_WARM' : 'TIER_3_COLD');

// ------------------------------------------------------------ Safety Gate

/** Alerts → LOW (none), MEDIUM (1–2), HIGH (3 or more). */
export const riskLevel = (alertCount) => (alertCount >= 3 ? 'HIGH' : alertCount >= 1 ? 'MEDIUM' : 'LOW');

/** Points taken off the lead scores for a risk level. */
export const SAFETY_SCORE_PENALTY = Object.freeze({ LOW: 0, MEDIUM: 10, HIGH: 25 });

export const SAFETY_NOTE_MARKER = '**Safety Gate check**';

export const penalisedScore = (score, level) => Math.max(0, (Number.isFinite(score) ? score : 0) - SAFETY_SCORE_PENALTY[level]);

// -------------------------------------------------------------- GDPR Art.14

export const CONTROLLER = 'Integra Scientific Ltd';
/** Placeholder until legal confirms the retention period (Art.14(2)(a)). */
export const RETENTION_TEXT = '24 months from our last contact with you, unless you become a customer, in which case for the duration of the contract and the statutory period after it';

/**
 * The Art.14 notice (data obtained from a source other than the data subject)
 * for one company's contact data. `contact` is the privacy contact line.
 */
export function gdprArt14Notice({ companyName, contactName, contact }) {
  const to = contactName ? `${contactName} (${companyName})` : companyName;
  return [
    `Privacy notice under Article 14 GDPR — for ${to}`,
    '',
    `Who we are: ${CONTROLLER}, the controller of this data. We provide EU regulatory services (digital product passports, authorised representation, training) to manufacturers exporting to the EU.`,
    `What data we hold: name and job title of a business contact (where known), the company name, website and LinkedIn company page, and a business e-mail address (where known).`,
    `Where it comes from: publicly available sources (the company's own website and LinkedIn company page) and business directories or trade-fair lists.`,
    `Why we hold it: our legitimate interest (Art.6(1)(f)) in identifying business-to-business leads for our EU regulatory services. We have weighed this against your interests and rights; we use only business contact data.`,
    `How long we keep it: ${RETENTION_TEXT}.`,
    `Your rights: to access, rectify and erase your data, to restrict its processing, to object to it at any time (Art.21), and to data portability. You may also complain to your data protection supervisory authority.`,
    `Contact: ${contact}`,
  ].join('\n');
}
