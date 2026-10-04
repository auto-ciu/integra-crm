/**
 * sync-portal-event — REST sidecar (F0.3b) Lambda, C3. The portal
 * (integrascientific/integra-scientific) POSTs
 * `{ eventType, customer, data?, source?, stripeEventId?, notes? }` with
 * bearer PORTAL_TOKEN whenever a customer does something worth recording.
 *
 *   1. PURCHASE / RENEWAL: find the customer's open Opportunity, or create
 *      one, and put it on the Subscribed stage. The customer (an e-mail
 *      address or a company name) is matched to a Person (by e-mail) and its
 *      Company (the person's, else by the e-mail's domain); a company name
 *      matches a Company by exact name. A Lost opportunity is closed business:
 *      a new payment opens a new one. A customer matching nothing still gets an
 *      Opportunity, named after them and linked to nobody, for staff to tidy.
 *   2. Record the CustomerEvent (processedAt now).
 *
 * The opportunity comes first so a retry after a failure finds it again and
 * does not leave a second one; an event that carries a `stripeEventId` is
 * recorded once however often it is sent (the repeat answers 200 with the
 * original ids). Other event types (cancellation, plan changes, support,
 * login) are only recorded.
 *
 * Responds 201 `{ eventId, opportunityId? }`.
 *
 * PORTAL_TOKEN is its own secret, not OPS_TOKEN: the portal holds it, so it
 * must only ever be able to post events.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can read
 * people / companies and write opportunities / customerEvents), PORTAL_TOKEN.
 */
import { z } from 'zod';

import { TwentyApiError, configFromEnv, createRecord, eq, findRecords, updateRecord, type TwentyConfig, type TwentyRecord } from '../../ops/lib/twenty-api';
import {
  CLOSED_OPPORTUNITY_STAGES,
  CUSTOMER_EVENT_SOURCES,
  CUSTOMER_EVENT_TYPES,
  OPPORTUNITY_STAGE_ON_PAYMENT,
  eventName,
  isEmail,
  touchesOpportunity,
} from '../../shared/portal-events.mjs';
import { json, matchCompany, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

// ------------------------------------------------------------------ payload

const MAX_DATA_CHARS = 20_000;

export const PortalEventPayload = z.object({
  eventType: z.enum(CUSTOMER_EVENT_TYPES.map((t) => t.value) as [string, ...string[]]),
  customer: z.string().trim().min(1).max(200),
  /** The portal's payload, stored as given. */
  data: z.unknown().default({}),
  source: z.enum(CUSTOMER_EVENT_SOURCES.map((s) => s.value) as [string, ...string[]]).default('PORTAL'),
  stripeEventId: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type PortalEventPayload = z.infer<typeof PortalEventPayload>;

export type PortalEventResult = { eventId: string; opportunityId?: string; duplicate?: boolean };

export class PortalEventError extends Error {
  constructor(
    readonly code: 'data_too_large',
    readonly status: number,
    readonly detail: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'PortalEventError';
  }
}

// ------------------------------------------------------------- opportunity

const asString = (value: unknown) => (typeof value === 'string' && value ? value : null);

/** The Person and Company a customer (e-mail or company name) refers to; either may be unknown. */
async function resolveCustomer(config: TwentyConfig, customer: string): Promise<{ person: TwentyRecord | null; company: TwentyRecord | null }> {
  if (!isEmail(customer)) {
    const [company] = await findRecords(config, 'companies', { filter: eq('name', customer), limit: 1 });
    return { person: null, company: company ?? null };
  }
  const email = customer.toLowerCase();
  const [person] = await findRecords(config, 'people', { filter: eq('emails.primaryEmail', email), limit: 1 });
  const companyId = asString(person?.companyId);
  const company = companyId
    ? (await findRecords(config, 'companies', { filter: eq('id', companyId), limit: 1 }))[0] ?? null
    : await matchCompany(config, email);
  return { person: person ?? null, company };
}

/** The customer's open Opportunity on the Subscribed stage, found or created. */
export async function ensureOpportunity(config: TwentyConfig, customer: string): Promise<string> {
  const { person, company } = await resolveCustomer(config, customer);
  const companyId = asString(company?.id);
  const personId = asString(person?.id);

  const notClosed = CLOSED_OPPORTUNITY_STAGES.map((stage) => `stage[neq]:${JSON.stringify(stage)}`).join(',');
  const owner = companyId ? eq('companyId', companyId) : personId ? eq('pointOfContactId', personId) : eq('name', customer);
  const [open] = await findRecords(config, 'opportunities', {
    filter: `and(${owner},${notClosed})`,
    orderBy: 'createdAt[DescNullsLast]',
    limit: 1,
  });
  if (open) {
    if (open.stage !== OPPORTUNITY_STAGE_ON_PAYMENT) await updateRecord(config, 'opportunities', open.id, { stage: OPPORTUNITY_STAGE_ON_PAYMENT });
    return open.id;
  }

  const created = await createRecord(config, 'opportunities', {
    name: asString(company?.name) ?? customer,
    stage: OPPORTUNITY_STAGE_ON_PAYMENT,
    ...(companyId ? { companyId } : {}),
    ...(personId ? { pointOfContactId: personId } : {}),
  });
  return created.id;
}

// -------------------------------------------------------------------- sync

export async function syncPortalEvent(config: TwentyConfig, p: PortalEventPayload, now = new Date()): Promise<PortalEventResult> {
  const payload = JSON.stringify(p.data ?? {}, null, 2);
  if (payload.length > MAX_DATA_CHARS) throw new PortalEventError('data_too_large', 413, { maxChars: MAX_DATA_CHARS });

  if (p.stripeEventId) {
    const [seen] = await findRecords(config, 'customerEvents', { filter: eq('stripeEventId', p.stripeEventId), limit: 1 });
    if (seen) return { eventId: seen.id, duplicate: true };
  }

  const opportunityId = touchesOpportunity(p.eventType) ? await ensureOpportunity(config, p.customer) : undefined;

  const event = await createRecord(config, 'customerEvents', {
    name: eventName(p.eventType, p.customer),
    eventType: p.eventType,
    customer: p.customer,
    data: { markdown: `\`\`\`json\n${payload}\n\`\`\``, blocknote: null },
    source: p.source,
    ...(p.stripeEventId ? { stripeEventId: p.stripeEventId } : {}),
    processedAt: now.toISOString(),
    ...(p.notes ? { notes: p.notes } : {}),
  });
  return { eventId: event.id, ...(opportunityId ? { opportunityId } : {}) };
}

// ------------------------------------------------------------------ handler

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.PORTAL_TOKEN);
  if ('error' in request) return request.error;
  const parsed = PortalEventPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const { duplicate, ...result } = await syncPortalEvent(configFromEnv(), parsed.data);
    return json(duplicate ? 200 : 201, result);
  } catch (error) {
    if (error instanceof PortalEventError) return json(error.status, { error: error.code, ...error.detail });
    console.error('[sync-portal-event]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
