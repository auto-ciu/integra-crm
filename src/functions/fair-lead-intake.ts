/**
 * fair-lead-intake — REST sidecar (F0.3b) Lambda behind API Gateway (HTTP
 * API, payload format 2.0). The mobile card-capture form at a fair POSTs a
 * visitor here; this records them in Twenty:
 *
 *   1. Idempotency: a FairLead with the same scanId → return it, create nothing.
 *   2. Company: match by e-mail domain (freemail skipped — shared/icp.mjs).
 *      No Company is created; what the visitor typed goes to companyName.
 *   3. Person: find by primary e-mail and fill gaps, else create (leadStatus
 *      NEW, so they also land on the "Fair leads" kanban).
 *   4. FairLead (followUpStatus NEW), then score it (score-fair-lead, A1 stub).
 *      A scoring failure is logged, not returned: the lead is already saved.
 *
 * Responds `{ id, scanId, created }` so the form can show its success screen.
 * Not yet: business-card image upload (no file in the payload).
 *
 * Same auth and shape as enquiry-intake. Env: TWENTY_API_URL, TWENTY_API_KEY
 * (an API key whose role can write people / fairLeads), INTAKE_TOKEN.
 */
import { z } from 'zod';

import {
  TwentyApiError,
  configFromEnv,
  createRecord,
  eq,
  findRecords,
  updateRecord,
  type TwentyConfig,
  type TwentyRecord,
} from '../../ops/lib/twenty-api';
import { json, matchCompany, randomToken, readAuthorisedJson, splitName, type HttpEvent, type HttpResult } from './lib/sidecar';
import { scoreFairLead } from './score-fair-lead';

// ------------------------------------------------------------------ payload

/** Option values mirror src/options.ts (PRODUCT_CATEGORY, FAIR_LEAD_SOURCE). */
const ProductCategory = z.enum([
  'BATTERY_LI_ION',
  'BATTERY_LMT',
  'TEXTILES',
  'ELECTRONICS',
  'FURNITURE',
  'TOYS',
  'MACHINERY',
  'MEDICAL_DEVICES',
  'OTHER',
]);

export const FairLeadPayload = z.object({
  /** QR-code / short-URL token; generated here when the form has none. */
  scanId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{4,64}$/)
    .optional(),
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  company: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(50).optional(),
  productInterest: z.array(ProductCategory).max(9).default([]),
  notes: z.string().trim().max(10_000).optional(),
  source: z.enum(['CANTON_FAIR_2026', 'CANTON_FAIR_2027', 'OTHER_FAIR', 'WALK_IN', 'ONLINE']).default('CANTON_FAIR_2026'),
});
export type FairLeadPayload = z.infer<typeof FairLeadPayload>;

export type FairLeadIntakeResult = { id: string; scanId: string; created: boolean };

// ------------------------------------------------------------------- intake

/** FL-XXXXXX: 31^6 ≈ 890M, short enough to read off a printed QR label. */
export const newScanId = () => `FL-${randomToken(6)}`;

async function upsertPerson(config: TwentyConfig, p: FairLeadPayload, companyId: string | null): Promise<TwentyRecord> {
  const [existing] = await findRecords(config, 'people', {
    filter: eq('emails.primaryEmail', p.email),
    limit: 1,
  });
  if (existing) {
    // Only fill gaps — never overwrite what staff have curated.
    const phones = existing.phones as { primaryPhoneNumber?: string | null } | null | undefined;
    const patch: Record<string, unknown> = {};
    if (!existing.companyId && companyId) patch.companyId = companyId;
    if (!phones?.primaryPhoneNumber && p.phone) patch.phones = { primaryPhoneNumber: p.phone };
    if (!existing.leadStatus) patch.leadStatus = 'NEW';
    if (Object.keys(patch).length > 0) await updateRecord(config, 'people', existing.id, patch);
    return existing;
  }
  return createRecord(config, 'people', {
    name: splitName(p.name),
    emails: { primaryEmail: p.email, additionalEmails: null },
    leadStatus: 'NEW',
    ...(p.phone ? { phones: { primaryPhoneNumber: p.phone } } : {}),
    ...(companyId ? { companyId } : {}),
  });
}

async function findByScanId(config: TwentyConfig, scanId: string): Promise<FairLeadIntakeResult | null> {
  const [found] = await findRecords(config, 'fairLeads', { filter: eq('scanId', scanId), limit: 1 });
  return found ? { id: found.id, scanId, created: false } : null;
}

/** Create the FairLead; if that fails because the scanId now exists, return the existing one. */
async function createFairLead(
  config: TwentyConfig,
  data: Record<string, unknown> & { scanId: string },
): Promise<{ created: TwentyRecord } | { existing: FairLeadIntakeResult }> {
  try {
    return { created: await createRecord(config, 'fairLeads', data) };
  } catch (error) {
    const existing = error instanceof TwentyApiError ? await findByScanId(config, data.scanId) : null;
    if (existing) return { existing };
    throw error;
  }
}

export async function intakeFairLead(config: TwentyConfig, p: FairLeadPayload, now = new Date()): Promise<FairLeadIntakeResult> {
  if (p.scanId) {
    const duplicate = await findByScanId(config, p.scanId);
    if (duplicate) return duplicate;
  }
  const scanId = p.scanId ?? newScanId();

  const company = await matchCompany(config, p.email);
  const person = await upsertPerson(config, p, company?.id ?? null);

  const outcome = await createFairLead(config, {
    scanId,
    personId: person.id,
    ...(company ? { companyId: company.id } : {}),
    companyName: p.company,
    source: p.source,
    productInterest: p.productInterest,
    ...(p.notes ? { notes: { markdown: p.notes, blocknote: null } } : {}),
    followUpStatus: 'NEW',
    capturedAt: now.toISOString(),
  });
  // A concurrent retry of the same scan won the unique scanId index.
  if ('existing' in outcome) return outcome.existing;
  const lead = outcome.created;

  try {
    await scoreFairLead(config, lead.id, now);
  } catch (error) {
    console.error('[fair-lead-intake] scoring failed', lead.id, error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
  }

  return { id: lead.id, scanId, created: true };
}

// ------------------------------------------------------------------ handler

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.INTAKE_TOKEN);
  if ('error' in request) return request.error;
  const parsed = FairLeadPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const result = await intakeFairLead(configFromEnv(), parsed.data);
    return json(result.created ? 201 : 200, result);
  } catch (error) {
    console.error('[fair-lead-intake]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
