/**
 * enquiry-triage — REST sidecar (F0.3b) Lambda, invoked asynchronously by
 * enquiry-intake with `{ enquiryId }`.
 *
 * STUB. It classifies the enquiry with Claude and returns the result, but does
 * not yet write anything back to Twenty. Still to do (E1):
 *   - PATCH the Enquiry: category / language if the form's were wrong,
 *     triageNotes ← summary, priority ← urgency, status SPAM when
 *     spamLikelihood > 0.9 (and suppress notifications);
 *   - store the suggested replies for the composer (E2);
 *   - add the Feature A ICP score.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY, ANTHROPIC_API_KEY (the F0.7
 * "integra-crm" workspace key, not the portal's).
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

import { configFromEnv, findRecords, eq, type TwentyConfig } from '../../ops/lib/twenty-api';

export const Triage = z.object({
  category: z.enum(['DPP', 'AR', 'TRAINING', 'AUTHORITIES', 'OTHER']),
  language: z.enum(['EN', 'ZH']),
  summary: z.string().describe('At most 40 words, in English'),
  spamLikelihood: z.number().min(0).max(1),
  urgency: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  suggestedReply: z.object({ en: z.string(), zh: z.string() }),
});
export type Triage = z.infer<typeof Triage>;

const SYSTEM = `You triage inbound enquiries for Integra Scientific, which helps Chinese manufacturers (mostly batteries) meet EU compliance: Digital Product Passports (DPP), acting as EU Authorised Representative (AR), training, and work with regulatory authorities.
Classify the enquiry, summarise it in at most 40 English words, estimate how likely it is to be spam, judge urgency (URGENT only for regulatory deadlines or market-surveillance action), and draft a short, polite first reply in English and in Simplified Chinese that acknowledges the request without committing to prices or dates.`;

type EnquiryForTriage = { subject: string; message: string; senderEmail: string };

async function loadEnquiry(config: TwentyConfig, enquiryId: string): Promise<EnquiryForTriage | null> {
  const [enquiry] = await findRecords(config, 'enquiries', { filter: eq('id', enquiryId), limit: 1 });
  if (!enquiry) return null;
  const [inbound] = await findRecords(config, 'enquiryMessages', {
    filter: `and(${eq('enquiryId', enquiryId)},${eq('direction', 'INBOUND')})`,
    orderBy: 'sentAt[AscNullsLast]',
    limit: 1,
  });
  const body = inbound?.body as { markdown?: string | null } | null | undefined;
  return {
    subject: String(enquiry.subject ?? ''),
    message: body?.markdown ?? '',
    senderEmail: String(inbound?.senderEmail ?? ''),
  };
}

export async function triageEnquiry(client: Anthropic, enquiry: EnquiryForTriage): Promise<Triage | null> {
  const response = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 4096,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Subject: ${enquiry.subject}\nFrom: ${enquiry.senderEmail}\n\n${enquiry.message}`,
      },
    ],
    output_config: { effort: 'low', format: betaZodOutputFormat(Triage) },
    // On a safety decline, the API re-runs the request on the model's default fallback.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });
  if (response.stop_reason === 'refusal') {
    console.warn('[enquiry-triage] refused', response.stop_details);
    return null;
  }
  return response.parsed_output ?? null;
}

export const handler = async (event: { enquiryId?: string }) => {
  if (!event?.enquiryId) return { ok: false, error: 'enquiryId is required' };
  const enquiry = await loadEnquiry(configFromEnv(), event.enquiryId);
  if (!enquiry) return { ok: false, error: 'enquiry not found' };
  const triage = await triageEnquiry(new Anthropic(), enquiry);
  // STUB: the write-back to Twenty goes here (see header).
  return { ok: triage !== null, enquiryId: event.enquiryId, triage };
};
