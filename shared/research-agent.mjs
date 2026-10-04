/**
 * D1-D2 Managed Agents research: the pieces of the session request that are
 * policy rather than plumbing — the pinned beta header, the $10 budget, the
 * quality rubric and the outcome description built from a brief. Pure; used
 * by src/functions/research-scheduler.ts and checked by verify-model.mjs.
 *
 * Managed Agents is a beta: if Anthropic ships a new header version, change
 * MANAGED_AGENTS_BETA here, nowhere else.
 */

export const ANTHROPIC_API_VERSION = '2023-06-01';
export const MANAGED_AGENTS_BETA = 'managed-agents-2026-04-01';

/** $10 per run. The API takes minor units (cents) as an integer string. */
export const RUN_BUDGET_USD = 10;
export const RUN_BUDGET = { type: 'limit', max_list_cost: { amount: String(RUN_BUDGET_USD * 100), currency: 'USD' } };

/** Findings from the last N days are sent to the agent so it does not repeat them. */
export const DEDUPE_DAYS = 90;
export const DEFAULT_CADENCE_DAYS = 7;
/** A report still RUNNING after this long is marked FAILED by the ingest. */
export const STUCK_AFTER_HOURS = 12;

export const RESEARCH_RUBRIC = `# Research quality rubric

1. /mnt/session/outputs/findings.json exists and is valid JSON with the keys "findings", "competitors" and "priceObservations".
2. Every finding has a title, a body, a category and an importance from the allowed values, and at least one source URL.
3. Every source URL was opened during the session; none is on linkedin.com.
4. No finding repeats one in the "already reported" list unless it states what changed.
5. Every regulatory finding names the instrument (regulation or standard number) and the date it applies from or was published.
6. Every price observation is a price published by the competitor, with its currency, date and source URL; none is estimated.
7. Every price observation's competitor appears in "competitors".
8. HIGH importance is used only for items needing action within weeks, and each such body says what the action is.
9. /mnt/session/outputs/report.md exists, summarises the findings in plain language for a sales lead, and has a section on gaps and uncertainty.
10. Every focus area, regulatory watchlist item and competitor on the watchlist is either covered or listed as a gap.
`;

const md = (v) => (v && typeof v === 'object' ? v.markdown : v) || '';

/**
 * The `description` of the user.define_outcome event.
 * `recentFindings` is [{ title, category, publicationDate }] from the last DEDUPE_DAYS.
 */
export function buildOutcomeDescription(brief, recentFindings = []) {
  const section = (title, body) => `## ${title}\n${String(body).trim() || '(none given)'}`;
  const reported = recentFindings.length
    ? recentFindings.map((f) => `- ${f.title}${f.category ? ` [${f.category}]` : ''}${f.publicationDate ? ` (${f.publicationDate})` : ''}`).join('\n')
    : '(nothing reported yet)';
  return [
    `Research brief: ${brief.title || 'Untitled'}${brief.scope ? ` — scope: ${brief.scope}` : ''}.`,
    'Write report.md and findings.json to /mnt/session/outputs/ as set out in your instructions.',
    section('Focus areas', md(brief.focusAreas)),
    section('Regulatory watchlist', md(brief.regulatoryWatchlist)),
    section('Competitor watchlist', md(brief.competitorWatchlist)),
    section(`Already reported in the last ${DEDUPE_DAYS} days (do not repeat)`, reported),
  ].join('\n\n');
}
