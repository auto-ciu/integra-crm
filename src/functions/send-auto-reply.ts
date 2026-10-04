/**
 * send-auto-reply — REST sidecar (F0.3b) Lambda, E2. Called in-process by
 * enquiry-intake after it creates the Enquiry, and invocable on its own
 * (POST `{ enquiryId }`, bearer OPS_TOKEN) to answer an enquiry that came in
 * some other way.
 *
 *   1. Skip spam: Turnstile FAILED or status SPAM gets no reply. (UNVERIFIED
 *      still does: the widget often fails to load from mainland China.)
 *   2. Idempotency: an auto-reply Enquiry Message already on the enquiry →
 *      return it, create nothing.
 *   3. Pick the best active ReplyTemplate for category × language: exact,
 *      then ALL category, then ALL language (shared/reply-templates.mjs).
 *   4. Render {{reference}} / {{name}} / {{company}} / {{category}} and record
 *      the reply as an OUTBOUND Enquiry Message (isAutoReply, sentAt empty).
 *
 * Not yet: the SES send. `sent` stays false and sentAt empty until SES sends
 * the message; the message's first line carries the rendered subject for it.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can read
 * enquiries / people / companies / replyTemplates and write enquiryMessages),
 * OPS_TOKEN (bearer for the standalone endpoint), AUTO_REPLY_FROM (default
 * support@integrascientific.com).
 */
import { z } from 'zod';

import {
  TwentyApiError,
  configFromEnv,
  createRecord,
  eq,
  findAllRecords,
  findRecords,
  type TwentyConfig,
} from '../../ops/lib/twenty-api';
import { renderTemplate, selectTemplate, templateValues } from '../../shared/reply-templates.mjs';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

export const AutoReplyPayload = z.object({ enquiryId: z.uuid() });

/** What a reply needs to know about its enquiry. Option values as in src/options.ts. */
export type AutoReplyInput = {
  enquiryId: string;
  reference: string;
  category: string;
  language: string;
  /** Requester's name and company as they typed them; blanks get a polite default. */
  name: string;
  company: string;
  spamCheck?: string | null;
  status?: string | null;
};

export type AutoReplyResult = {
  templateId: string | null;
  messageId: string | null;
  /** True once the e-mail has gone out. Always false until SES is wired. */
  sent: boolean;
  skipped?: 'spam' | 'already_replied' | 'no_template';
};

const DEFAULT_FROM = 'support@integrascientific.com';

export async function sendAutoReply(config: TwentyConfig, input: AutoReplyInput): Promise<AutoReplyResult> {
  if (input.spamCheck === 'FAILED' || input.status === 'SPAM') {
    return { templateId: null, messageId: null, sent: false, skipped: 'spam' };
  }

  const [already] = await findRecords(config, 'enquiryMessages', {
    filter: `and(${eq('enquiryId', input.enquiryId)},isAutoReply[eq]:true)`,
    limit: 1,
  });
  if (already) return { templateId: null, messageId: already.id, sent: false, skipped: 'already_replied' };

  const templates = await findAllRecords(config, 'replyTemplates', { filter: 'isActive[eq]:true' });
  const template = selectTemplate(templates, { category: input.category, language: input.language });
  if (!template) return { templateId: null, messageId: null, sent: false, skipped: 'no_template' };

  const values = templateValues(input);
  const subject = renderTemplate(template.subject, { reference: values.reference });
  const body = renderTemplate((template.body as { markdown?: string | null } | null)?.markdown ?? '', values);

  const message = await createRecord(config, 'enquiryMessages', {
    name: `${input.reference} · auto-reply`,
    enquiryId: input.enquiryId,
    direction: 'OUTBOUND',
    body: { markdown: `**Subject:** ${subject}\n\n---\n\n${body}`, blocknote: null },
    senderEmail: process.env.AUTO_REPLY_FROM || DEFAULT_FROM,
    sentAt: null,
    isAutoReply: true,
  });

  return { templateId: template.id, messageId: message.id, sent: false };
}

// --------------------------------------------------- standalone (by enquiryId)

/** The `- **Company:** …` line enquiry-intake writes into the inbound message. */
const COMPANY_LINE = /^- \*\*Company:\*\* (.+)$/m;

async function loadReplyInput(config: TwentyConfig, enquiryId: string): Promise<AutoReplyInput | null> {
  const [enquiry] = await findRecords(config, 'enquiries', { filter: eq('id', enquiryId), limit: 1 });
  if (!enquiry) return null;

  const [person] = enquiry.relatedPersonId
    ? await findRecords(config, 'people', { filter: eq('id', String(enquiry.relatedPersonId)), limit: 1 })
    : [];
  const fullName = person?.name as { firstName?: string | null; lastName?: string | null } | null | undefined;

  let company = '';
  if (enquiry.relatedCompanyId) {
    const [found] = await findRecords(config, 'companies', { filter: eq('id', String(enquiry.relatedCompanyId)), limit: 1 });
    company = String(found?.name ?? '');
  }
  if (!company) {
    const [inbound] = await findRecords(config, 'enquiryMessages', {
      filter: `and(${eq('enquiryId', enquiryId)},${eq('direction', 'INBOUND')})`,
      orderBy: 'sentAt[AscNullsLast]',
      limit: 1,
    });
    const markdown = (inbound?.body as { markdown?: string | null } | null | undefined)?.markdown ?? '';
    company = COMPANY_LINE.exec(markdown)?.[1] ?? '';
  }

  return {
    enquiryId,
    reference: String(enquiry.reference ?? ''),
    category: String(enquiry.category ?? 'OTHER'),
    language: String(enquiry.language ?? 'EN'),
    name: `${fullName?.firstName ?? ''} ${fullName?.lastName ?? ''}`.trim(),
    company,
    spamCheck: (enquiry.spamCheck as string | null) ?? null,
    status: (enquiry.status as string | null) ?? null,
  };
}

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  const parsed = AutoReplyPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const config = configFromEnv();
    const input = await loadReplyInput(config, parsed.data.enquiryId);
    if (!input) return json(404, { error: 'enquiry_not_found' });
    const result = await sendAutoReply(config, input);
    return json(result.messageId && !result.skipped ? 201 : 200, result);
  } catch (error) {
    console.error('[send-auto-reply]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
