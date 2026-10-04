/**
 * Fair-lead score (A1 stub): a deterministic 0–100 score from what the
 * capture form collects. src/functions/score-fair-lead.ts applies it;
 * verify-model.mjs checks it. Plain ESM, like shared/icp.mjs.
 *
 *   product interest   points of the highest-value category picked (below)
 *   e-mail domain      +15 for a company (non-freemail) domain
 *   phone              +10
 *   company            +10 when a Company matched or a company name was given
 *
 * The rules top out at 65; A1's Claude ICP scorer replaces them and uses the
 * full range.
 */
import { companyDomainForEmail } from './icp.mjs';

/** Keyed by PRODUCT_CATEGORY value (src/options.ts). */
export const PRODUCT_INTEREST_POINTS = Object.freeze({
  BATTERY_LI_ION: 30,
  MEDICAL_DEVICES: 30,
  BATTERY_LMT: 20,
  ELECTRONICS: 15,
  MACHINERY: 15,
  TEXTILES: 10,
  FURNITURE: 10,
  TOYS: 10,
  OTHER: 5,
});

export const COMPANY_DOMAIN_POINTS = 15;
export const PHONE_POINTS = 10;
export const COMPANY_POINTS = 10;

const filled = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * @param {{ productInterest?: string[] | null, email?: string | null, phone?: string | null,
 *           companyId?: string | null, companyName?: string | null }} lead
 * @returns {{ score: number, breakdown: Array<{ rule: string, points: number, max: number, detail: string }> }}
 */
export function scoreFairLead(lead) {
  const interests = lead.productInterest ?? [];
  const best = interests.reduce(
    (top, category) => ((PRODUCT_INTEREST_POINTS[category] ?? 0) > top.points ? { category, points: PRODUCT_INTEREST_POINTS[category] } : top),
    { category: null, points: 0 },
  );
  const domain = companyDomainForEmail(lead.email);
  const hasCompany = filled(lead.companyId) || filled(lead.companyName);

  const breakdown = [
    {
      rule: 'Product interest',
      points: best.points,
      max: Math.max(...Object.values(PRODUCT_INTEREST_POINTS)),
      detail: best.category ? `highest-value interest: ${best.category}` : 'no product interest given',
    },
    {
      rule: 'E-mail domain',
      points: domain ? COMPANY_DOMAIN_POINTS : 0,
      max: COMPANY_DOMAIN_POINTS,
      detail: domain ? `company domain ${domain}` : 'freemail or missing address',
    },
    {
      rule: 'Phone',
      points: filled(lead.phone) ? PHONE_POINTS : 0,
      max: PHONE_POINTS,
      detail: filled(lead.phone) ? 'given' : 'missing',
    },
    {
      rule: 'Company',
      points: hasCompany ? COMPANY_POINTS : 0,
      max: COMPANY_POINTS,
      detail: filled(lead.companyId) ? 'matched in CRM' : hasCompany ? 'name given' : 'missing',
    },
  ];
  const total = breakdown.reduce((sum, item) => sum + item.points, 0);
  return { score: Math.max(0, Math.min(100, total)), breakdown };
}

/** Markdown for FairLead.scoreBreakdown. */
export function breakdownMarkdown({ score, breakdown }) {
  const lines = breakdown.map((b) => `- **${b.rule}:** ${b.points}/${b.max} — ${b.detail}`);
  return `**Score ${score}** (rules v1)\n\n${lines.join('\n')}`;
}
