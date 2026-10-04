/**
 * D1-D2 AI market research: the prompt for each product category, the depth
 * and status option sets, and how a ResearchBrief becomes the prompt sent to
 * Claude. Single source of truth for:
 *   - src/options.ts                    (ResearchBrief depth / status options)
 *   - ops/seed-research-briefs.mjs      (one brief per topic)
 *   - verify-model.mjs                  (every prompt belongs to a product category)
 *
 * Topics are the PRODUCT_CATEGORY values of shared/streams.mjs; categories
 * with no prompt here (OTHER) cannot be researched. Plain ESM.
 */

export const RESEARCH_DEPTHS = [
  { value: 'OVERVIEW', label: 'Overview · 概览', color: 'blue' },
  { value: 'DEEP_DIVE', label: 'Deep dive · 深度分析', color: 'purple' },
  { value: 'COMPLIANCE_CHECK', label: 'Compliance check · 合规检查', color: 'orange' },
];

export const RESEARCH_STATUSES = [
  { value: 'DRAFT', label: 'Draft · 草稿', color: 'gray' },
  { value: 'SUBMITTED', label: 'Submitted · 已提交', color: 'sky' },
  { value: 'IN_PROGRESS', label: 'In progress · 进行中', color: 'blue' },
  { value: 'COMPLETED', label: 'Completed · 已完成', color: 'green' },
  { value: 'FAILED', label: 'Failed · 失败', color: 'red' },
];

export const REPORT_STATUSES = [
  { value: 'RUNNING', label: 'Running · 运行中', color: 'blue' },
  { value: 'INGESTING', label: 'Ingesting · 导入中', color: 'orange' },
  { value: 'READY', label: 'Ready · 就绪', color: 'green' },
  { value: 'FAILED', label: 'Failed · 失败', color: 'red' },
];

export const FINDING_CATEGORIES = [
  { value: 'REGULATORY', label: 'Regulatory · 法规', color: 'orange' },
  { value: 'COMPETITOR', label: 'Competitor · 竞争对手', color: 'red' },
  { value: 'PRICING', label: 'Pricing · 价格', color: 'green' },
  { value: 'DEMAND', label: 'Demand · 需求', color: 'blue' },
  { value: 'TECHNOLOGY', label: 'Technology · 技术', color: 'purple' },
  { value: 'OTHER', label: 'Other · 其他', color: 'gray' },
];

export const FINDING_IMPORTANCES = [
  { value: 'HIGH', label: 'High · 高', color: 'red' },
  { value: 'MEDIUM', label: 'Medium · 中', color: 'orange' },
  { value: 'LOW', label: 'Low · 低', color: 'gray' },
];

export const DEFAULT_RESEARCH_SCOPE = 'EU';
export const DEFAULT_RESEARCH_DEPTH = 'OVERVIEW';

/** Keyed by PRODUCT_CATEGORY value (src/options.ts, shared/streams.mjs). */
export const RESEARCH_PROMPTS = {
  BATTERY_LI_ION:
    'Analyse the latest EU Battery Regulation updates and their impact on Chinese Li-ion battery manufacturers exporting to the EU. Include: key deadlines, required documentation, testing standards, and competitive implications.',
  BATTERY_LMT:
    'Analyse EU LMT (Light Means of Transport) battery regulations, including EN 50604-1, UN 38.3, and upcoming changes. Focus on compliance requirements for Chinese manufacturers.',
  TEXTILES:
    'Summarise EU textile regulations including REACH, EU Ecolabel, and the upcoming Digital Product Passport for textiles. Impact on Chinese textile exporters.',
  ELECTRONICS:
    'Summarise EU electronics regulations: EMC Directive, LVD, RoHS, WEEE, Radio Equipment Directive. Key changes and compliance pathways for Chinese manufacturers.',
  FURNITURE:
    'Summarise EU furniture regulations: General Product Safety Regulation, formaldehyde limits, fire safety standards. New requirements under GPSR.',
  TOYS:
    'Summarise EU Toy Safety Directive updates, EN 71 standards, and upcoming Digital Product Passport for toys. Impact on Chinese toy exporters.',
  MACHINERY:
    'Summarise EU Machinery Regulation 2023/1230 replacing the Machinery Directive. New conformity assessment modules and digital documentation requirements.',
  MEDICAL_DEVICES:
    'Summarise EU MDR 2017/745 updates, notified body capacity, and China-specific compliance pathways for medical device exporters.',
};

export const RESEARCH_TOPICS = Object.keys(RESEARCH_PROMPTS);

/** What each depth asks of the answer, appended to the topic prompt. */
export const DEPTH_INSTRUCTIONS = {
  OVERVIEW: 'Depth: overview. Keep it to a concise briefing a sales lead can read in five minutes.',
  DEEP_DIVE: 'Depth: deep dive. Cover each requirement in detail, with the legal basis, deadlines and the practical steps a manufacturer must take.',
  COMPLIANCE_CHECK: 'Depth: compliance check. Produce a checklist of obligations a manufacturer must evidence, with the document or test report that satisfies each.',
};

const NO_BROWSING =
  'You have no web access. Report only what you are confident of, with dates and official act numbers; say so plainly where you cannot confirm something rather than guessing. Never invent regulation numbers, dates or URLs.';

/** The exact prompt for one brief, or null when the topic has no prompt template. */
export function researchPrompt({ topic, scope = DEFAULT_RESEARCH_SCOPE, depth = DEFAULT_RESEARCH_DEPTH }) {
  const base = RESEARCH_PROMPTS[topic];
  const instruction = DEPTH_INSTRUCTIONS[depth];
  if (!base || !instruction) return null;
  return [base, `Scope: ${String(scope).trim() || DEFAULT_RESEARCH_SCOPE}.`, instruction, NO_BROWSING].join('\n\n');
}

/** The record's title, e.g. "Battery — Li-ion · EU · Overview". */
export function briefTitle(topicName, scope, depth) {
  const depthLabel = RESEARCH_DEPTHS.find((d) => d.value === depth)?.label.split(' · ')[0] ?? depth;
  return `${topicName} · ${scope} · ${depthLabel}`;
}
