/**
 * email-to-ticket — REST sidecar (F0.3b) Lambda behind API Gateway (HTTP API,
 * payload format 2.0), E3. The SES → Lambda receiving rule POSTs each parsed
 * inbound e-mail here:
 *
 *   { from, to, subject, body, messageId, references?, inReplyTo? }
 *
 *   1. Dedupe: an Enquiry Message with this messageId → 200, nothing created.
 *   2. Thread: inReplyTo / references matching a stored message's messageId
 *      (else an ENQ-YYMMDD-XXXX reference in the subject) → the e-mail is
 *      appended to that enquiry as an INBOUND Enquiry Message. A PENDING
 *      enquiry (waiting on the client) or a CLOSED one goes back to OPEN
 *      (closedAt cleared); lastActivityAt moves.
 *   3. New thread: Person by sender e-mail (else created from the From header),
 *      Company by e-mail domain, then a new Enquiry — source EMAIL, priority
 *      NORMAL, language detected, assignee from the routing rules, slaTarget
 *      from the SlaPolicy for its priority — plus its INBOUND message.
 *
 * Responds { enquiryId, messageId, isNew, status } where messageId is the
 * Enquiry Message record's id. A reply to an existing thread has isNew false.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (a key whose role can read/write people,
 * enquiries, enquiryMessages and read companies, slaPolicies,
 * enquiryRoutingRules), EMAIL_TICKET_TOKEN (bearer shared with the SES Lambda).
 */
import { z } from 'zod';

import {
  TwentyApiError,
  configFromEnv,
  createRecord,
  eq,
  findAllRecords,
  findRecords,
  updateRecord,
  type TwentyConfig,
  type TwentyRecord,
} from '../../ops/lib/twenty-api';
import {
  cleanSubject,
  contactNameFor,
  detectLanguage,
  messageIds,
  parseSender,
  pickRoutingRule,
  referenceInSubject,
  slaTargetFor,
  statusAfterInbound,
} from '../../shared/sla.mjs';
import { newReference } from './enquiry-intake';
import { json, matchCompany, readAuthorisedJson, splitName, type HttpEvent, type HttpResult } from './lib/sidecar';

export const EmailPayload = z.object({
  from: z.string().trim().min(1).max(500),
  to: z.string().trim().max(2000).optional(),
  subject: z.string().trim().max(1000).default(''),
  body: z.string().max(200_000).default(''),
  messageId: z.string().trim().min(1).max(998),
  references: z.union([z.string(), z.array(z.string())]).optional(),
  inReplyTo: z.string().optional(),
});
export type EmailPayload = z.infer<typeof EmailPayload>;

export type EmailTicketResult = {
  enquiryId: string;
  /** The Enquiry Message record created for this e-mail (the existing one for a duplicate). */
  messageId: string;
  isNew: boolean;
  status: string;
  /** True when this messageId was already processed. */
  duplicate?: boolean;
};

const bodyMarkdown = (body: string) => ({ markdown: body, blocknote: null });

/** Message ids are stored without angle brackets so `<a@b>` and `a@b` are the same key. */
const normaliseId = (id: string) => id.replace(/^<|>$/g, '').trim();

async function findMessageByMessageId(config: TwentyConfig, id: string): Promise<TwentyRecord | null> {
  const [found] = await findRecords(config, 'enquiryMessages', { filter: eq('messageId', id), limit: 1 });
  return found ?? null;
}

/** The enquiry an e-mail belongs to, or null for a new thread. */
async function findThread(config: TwentyConfig, p: EmailPayload): Promise<TwentyRecord | null> {
  const ids = messageIds([p.inReplyTo ?? '', ...(Array.isArray(p.references) ? p.references : [p.references ?? ''])]);
  for (const id of ids) {
    const message = await findMessageByMessageId(config, id);
    if (message?.enquiryId) {
      const [enquiry] = await findRecords(config, 'enquiries', { filter: eq('id', String(message.enquiryId)), limit: 1 });
      if (enquiry) return enquiry;
    }
  }
  const reference = referenceInSubject(p.subject);
  if (reference) {
    const [enquiry] = await findRecords(config, 'enquiries', { filter: eq('reference', reference), limit: 1 });
    if (enquiry) return enquiry;
  }
  return null;
}

async function upsertPerson(config: TwentyConfig, sender: { name: string; email: string }, companyId: string | null, language: string) {
  const [existing] = await findRecords(config, 'people', { filter: eq('emails.primaryEmail', sender.email), limit: 1 });
  if (existing) {
    if (!existing.companyId && companyId) await updateRecord(config, 'people', existing.id, { companyId });
    return existing;
  }
  return createRecord(config, 'people', {
    name: splitName(contactNameFor(sender) || sender.email),
    emails: { primaryEmail: sender.email, additionalEmails: null },
    language,
    preferredChannel: 'EMAIL',
    leadStatus: 'NEW',
    ...(companyId ? { companyId } : {}),
  });
}

async function addInboundMessage(config: TwentyConfig, enquiry: { id: string; reference: string }, p: EmailPayload, senderEmail: string, now: Date) {
  return createRecord(config, 'enquiryMessages', {
    name: `${enquiry.reference} · inbound`,
    enquiryId: enquiry.id,
    direction: 'INBOUND',
    body: bodyMarkdown(p.body),
    senderEmail,
    sentAt: now.toISOString(),
    isAutoReply: false,
    messageId: normaliseId(p.messageId),
  });
}

export async function emailToTicket(config: TwentyConfig, p: EmailPayload, now = new Date()): Promise<EmailTicketResult> {
  const messageId = normaliseId(p.messageId);
  const duplicate = await findMessageByMessageId(config, messageId);
  if (duplicate) return duplicateResult(config, duplicate);

  const sender = parseSender(p.from);
  if (!sender.email) throw new InvalidEmailError('from has no e-mail address');

  try {
    const thread = await findThread(config, p);
    return thread ? await appendToThread(config, thread, p, sender.email, now) : await openTicket(config, p, sender, now);
  } catch (error) {
    // A concurrent delivery of the same message won the unique messageId index.
    const raced = error instanceof TwentyApiError ? await findMessageByMessageId(config, messageId) : null;
    if (raced) return duplicateResult(config, raced);
    throw error;
  }
}

export class InvalidEmailError extends Error {}

async function duplicateResult(config: TwentyConfig, message: TwentyRecord): Promise<EmailTicketResult> {
  const [enquiry] = await findRecords(config, 'enquiries', { filter: eq('id', String(message.enquiryId)), limit: 1 });
  return { enquiryId: String(message.enquiryId), messageId: message.id, isNew: false, status: String(enquiry?.status ?? ''), duplicate: true };
}

async function appendToThread(config: TwentyConfig, enquiry: TwentyRecord, p: EmailPayload, senderEmail: string, now: Date): Promise<EmailTicketResult> {
  const message = await addInboundMessage(config, { id: enquiry.id, reference: String(enquiry.reference) }, p, senderEmail, now);
  const current = String(enquiry.status ?? 'NEW');
  const status = statusAfterInbound(current);
  await updateRecord(config, 'enquiries', enquiry.id, {
    lastActivityAt: now.toISOString(),
    ...(status !== current ? { status, closedAt: null } : {}),
  });
  return { enquiryId: enquiry.id, messageId: message.id, isNew: false, status };
}

async function openTicket(config: TwentyConfig, p: EmailPayload, sender: { name: string; email: string }, now: Date): Promise<EmailTicketResult> {
  const language = detectLanguage(`${p.subject} ${p.body}`);
  const company = await matchCompany(config, sender.email);
  const person = await upsertPerson(config, sender, company?.id ?? null, language);

  const rules = await findAllRecords(config, 'enquiryRoutingRules');
  const rule = pickRoutingRule(rules, { category: undefined, language });
  const policies = await findAllRecords(config, 'slaPolicies');
  const priority = 'NORMAL';
  const reference = newReference(now);

  const enquiry = await createRecord(config, 'enquiries', {
    reference,
    status: 'NEW',
    priority,
    subject: cleanSubject(p.subject).slice(0, 200) || `E-mail from ${contactNameFor(sender) || sender.email}`,
    language,
    source: 'EMAIL',
    relatedPersonId: person.id,
    ...(company ? { relatedCompanyId: company.id } : {}),
    ...(rule?.assignToId ? { assignedToId: rule.assignToId } : {}),
    slaTarget: slaTargetFor(priority, policies, now),
    lastActivityAt: now.toISOString(),
  });
  const message = await addInboundMessage(config, { id: enquiry.id, reference }, p, sender.email, now);
  return { enquiryId: enquiry.id, messageId: message.id, isNew: true, status: 'NEW' };
}

// ------------------------------------------------------------------ handler

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.EMAIL_TICKET_TOKEN);
  if ('error' in request) return request.error;
  const parsed = EmailPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const { duplicate, ...result } = await emailToTicket(configFromEnv(), parsed.data);
    return json(duplicate || !result.isNew ? 200 : 201, result);
  } catch (error) {
    if (error instanceof InvalidEmailError) return json(400, { error: 'invalid_payload', message: error.message });
    // 5xx makes SES retry, so the e-mail is never lost.
    console.error('[email-to-ticket]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
