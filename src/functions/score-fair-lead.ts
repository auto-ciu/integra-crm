/**
 * score-fair-lead — REST sidecar (F0.3b) Lambda, A1 stub. Called in-process
 * by fair-lead-intake after it creates a FairLead, and invocable on its own
 * with `{ fairLeadId }` to re-score one.
 *
 * STUB: the score is the deterministic rule set in shared/scoring.mjs
 * (product interest, e-mail domain, phone, company). A1 replaces it with the
 * Claude ICP scorer against the stream's rubric; the write-back stays.
 *
 * Writes FairLead.score, scoreBreakdown (markdown) and scoredAt.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can read
 * people and write fairLeads).
 */
import { configFromEnv, eq, findRecords, updateRecord, type TwentyConfig } from '../../ops/lib/twenty-api';
import { breakdownMarkdown, scoreFairLead as scoreLead } from '../../shared/scoring.mjs';

export type ScoreBreakdown = ReturnType<typeof scoreLead>['breakdown'];
export type ScoreResult = { fairLeadId: string; score: number; breakdown: ScoreBreakdown };

/** Score one FairLead and write the result back; null if it does not exist. */
export async function scoreFairLead(config: TwentyConfig, fairLeadId: string, now = new Date()): Promise<ScoreResult | null> {
  const [lead] = await findRecords(config, 'fairLeads', { filter: eq('id', fairLeadId), limit: 1 });
  if (!lead) return null;
  const [person] = lead.personId
    ? await findRecords(config, 'people', { filter: eq('id', String(lead.personId)), limit: 1 })
    : [];
  const emails = person?.emails as { primaryEmail?: string | null } | null | undefined;
  const phones = person?.phones as { primaryPhoneNumber?: string | null } | null | undefined;

  const result = scoreLead({
    productInterest: (lead.productInterest as string[] | null) ?? [],
    email: emails?.primaryEmail ?? null,
    phone: phones?.primaryPhoneNumber ?? null,
    companyId: (lead.companyId as string | null) ?? null,
    companyName: (lead.companyName as string | null) ?? null,
  });

  await updateRecord(config, 'fairLeads', fairLeadId, {
    score: result.score,
    scoreBreakdown: { markdown: breakdownMarkdown(result), blocknote: null },
    scoredAt: now.toISOString(),
  });
  return { fairLeadId, score: result.score, breakdown: result.breakdown };
}

export const handler = async (event: { fairLeadId?: string }) => {
  if (!event?.fairLeadId) return { ok: false, error: 'fairLeadId is required' };
  const result = await scoreFairLead(configFromEnv(), event.fairLeadId);
  if (!result) return { ok: false, error: 'fair lead not found' };
  return { ok: true, ...result };
};
