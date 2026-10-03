/**
 * enquiry-intake — REST sidecar (F0.3b) Lambda behind API Gateway (HTTP API,
 * payload format 2.0). The website's Pages Function POSTs a Turnstile-checked
 * contact-form submission here; this creates the Enquiry in Twenty:
 *
 *   1. Idempotency: an Enquiry with the same intakeId → return it, create nothing.
 *   2. Person: find by primary e-mail, else create (language, preferred
 *      channel EMAIL, leadStatus NEW).
 *   3. Company: match by e-mail domain (freemail skipped — shared/icp.mjs).
 *      No Company is created here; Promote to lead does that.
 *   4. Enquiry (status NEW) + its INBOUND Enquiry Message.
 *
 * Not yet: triage hand-off (enquiry-triage), routing rules, SES notifications.
 *
 * REST-only through ops/lib/twenty-api.ts (principle U5), so it works whether
 * or not the server runs logic functions. Not a Twenty app entity: no
 * define*() call, so the app's manifest builder ignores this file.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can write
 * people / enquiries / enquiryMessages), INTAKE_TOKEN (shared bearer secret
 * with the Pages Function).
 */
import { randomInt, timingSafeEqual } from 'node:crypto';
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
import { companyDomainForEmail, hostMatchesDomain } from '../../shared/icp.mjs';

// ------------------------------------------------------------------ payload

/** Option values mirror src/options.ts (ENQUIRY_CATEGORY, ENQUIRY_LANGUAGE, SPAM_CHECK). */
export const EnquiryPayload = z.object({
  intakeId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  company: z.string().trim().min(1).max(200),
  interest: z.enum(['DPP', 'AR', 'TRAINING', 'AUTHORITIES', 'OTHER']),
  message: z.string().trim().min(1).max(10_000),
  consentPrivacy: z.literal(true),
  subject: z.string().trim().max(200).optional(),
  language: z.enum(['EN', 'ZH']).default('EN'),
  country: z.string().trim().max(100).optional(),
  productCategory: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(50).optional(),
  wechatId: z.string().trim().max(100).optional(),
  marketingOptIn: z.boolean().default(false),
  sourcePage: z.string().trim().max(500).optional(),
  utmSource: z.string().trim().max(200).optional(),
  utmMedium: z.string().trim().max(200).optional(),
  utmCampaign: z.string().trim().max(200).optional(),
  /** Set by the Pages Function from Turnstile siteverify. */
  spamCheck: z.enum(['VERIFIED', 'UNVERIFIED', 'FAILED']),
});
export type EnquiryPayload = z.infer<typeof EnquiryPayload>;

export type IntakeResult = {
  reference: string;
  enquiryId: string;
  personId: string;
  companyId: string | null;
  duplicate: boolean;
};

// ------------------------------------------------------------------- intake

const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L

/** ENQ-YYMMDD-XXXX (UTC date). 31^4 ≈ 920k per day; `reference` is unique-indexed. */
export function newReference(now = new Date()): string {
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
  const suffix = Array.from({ length: 4 }, () => REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)]).join('');
  return `ENQ-${yymmdd}-${suffix}`;
}

const INTEREST_LABEL: Record<EnquiryPayload['interest'], string> = {
  DPP: 'DPP',
  AR: 'EU Representative',
  TRAINING: 'Training',
  AUTHORITIES: 'For Authorities',
  OTHER: 'General',
};

const splitName = (name: string) => {
  const [firstName, ...rest] = name.split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
};

async function upsertPerson(config: TwentyConfig, p: EnquiryPayload, companyId: string | null): Promise<TwentyRecord> {
  const [existing] = await findRecords(config, 'people', {
    filter: eq('emails.primaryEmail', p.email),
    limit: 1,
  });
  if (existing) {
    // Only fill gaps — never overwrite what staff have curated.
    const patch: Record<string, unknown> = {};
    if (!existing.language) patch.language = p.language;
    if (!existing.companyId && companyId) patch.companyId = companyId;
    if (!existing.wechatId && p.wechatId) patch.wechatId = p.wechatId;
    if (Object.keys(patch).length > 0) await updateRecord(config, 'people', existing.id, patch);
    return existing;
  }
  return createRecord(config, 'people', {
    name: splitName(p.name),
    emails: { primaryEmail: p.email, additionalEmails: null },
    language: p.language,
    preferredChannel: 'EMAIL',
    leadStatus: 'NEW',
    ...(p.wechatId ? { wechatId: p.wechatId } : {}),
    ...(companyId ? { companyId } : {}),
  });
}

/** Company whose website host is the sender's domain (or a subdomain of it). */
async function matchCompany(config: TwentyConfig, email: string): Promise<TwentyRecord | null> {
  const domain = companyDomainForEmail(email);
  if (!domain) return null;
  const candidates = await findRecords(config, 'companies', {
    filter: `domainName.primaryLinkUrl[ilike]:${JSON.stringify(`%${domain}%`)}`,
    limit: 10,
  });
  return (
    candidates.find((c) => {
      const links = c.domainName as { primaryLinkUrl?: string } | null | undefined;
      return hostMatchesDomain(links?.primaryLinkUrl ?? '', domain);
    }) ?? null
  );
}

/** Create the Enquiry; if that fails because the intakeId now exists, return the existing one. */
async function createEnquiry(
  config: TwentyConfig,
  data: Record<string, unknown> & { intakeId: string },
): Promise<{ created: TwentyRecord } | { existing: IntakeResult }> {
  try {
    return { created: await createRecord(config, 'enquiries', data) };
  } catch (error) {
    const existing = error instanceof TwentyApiError ? await findByIntakeId(config, data.intakeId) : null;
    if (existing) return { existing };
    throw error;
  }
}

/** Markdown for the INBOUND message: the requester's text plus the form's extras. */
function messageMarkdown(p: EnquiryPayload): string {
  const extras: Array<[string, string | undefined]> = [
    ['Company', p.company],
    ['Country', p.country],
    ['Product category', p.productCategory],
    ['Phone', p.phone],
    ['WeChat', p.wechatId],
    ['Marketing opt-in', p.marketingOptIn ? 'yes' : 'no'],
  ];
  const lines = extras.filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${v}`);
  return `${p.message}\n\n---\n${lines.join('\n')}`;
}

async function findByIntakeId(config: TwentyConfig, intakeId: string): Promise<IntakeResult | null> {
  const [found] = await findRecords(config, 'enquiries', { filter: eq('intakeId', intakeId), limit: 1 });
  if (!found) return null;
  return {
    reference: String(found.reference),
    enquiryId: found.id,
    personId: String(found.relatedPersonId ?? ''),
    companyId: (found.relatedCompanyId as string | null) ?? null,
    duplicate: true,
  };
}

export async function intakeEnquiry(config: TwentyConfig, p: EnquiryPayload, now = new Date()): Promise<IntakeResult> {
  const duplicate = await findByIntakeId(config, p.intakeId);
  if (duplicate) return duplicate;

  const company = await matchCompany(config, p.email);
  const person = await upsertPerson(config, p, company?.id ?? null);
  const reference = newReference(now);

  const outcome = await createEnquiry(config, {
    reference,
    intakeId: p.intakeId,
    status: 'NEW',
    priority: 'NORMAL',
    category: p.interest,
    subject: p.subject || `${INTEREST_LABEL[p.interest]} enquiry — ${p.company}`.slice(0, 200),
    language: p.language,
    source: 'WEB_FORM',
    sourcePage: p.sourcePage ?? '',
    utmSource: p.utmSource ?? '',
    utmMedium: p.utmMedium ?? '',
    utmCampaign: p.utmCampaign ?? '',
    spamCheck: p.spamCheck,
    relatedPersonId: person.id,
    ...(company ? { relatedCompanyId: company.id } : {}),
  });
  // A concurrent retry of the same submission won the unique intakeId index.
  if ('existing' in outcome) return outcome.existing;
  const enquiry = outcome.created;

  await createRecord(config, 'enquiryMessages', {
    name: `${reference} · inbound`,
    enquiryId: enquiry.id,
    direction: 'INBOUND',
    body: { markdown: messageMarkdown(p), blocknote: null },
    senderEmail: p.email,
    sentAt: now.toISOString(),
    isAutoReply: false,
  });

  return { reference, enquiryId: enquiry.id, personId: person.id, companyId: company?.id ?? null, duplicate: false };
}

// ------------------------------------------------------------------ handler

/** The parts of an API Gateway HTTP API (payload 2.0) event this handler reads. */
export type HttpEvent = {
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext?: { http?: { method?: string } };
};

export type HttpResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const json = (statusCode: number, body: unknown): HttpResult => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

function isAuthorised(header: string | undefined, token: string | undefined): boolean {
  if (!token || !header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  if (event.requestContext?.http?.method && event.requestContext.http.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }
  const headers = Object.fromEntries(Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (!isAuthorised(headers.authorization, process.env.INTAKE_TOKEN)) {
    return json(401, { error: 'unauthorised' });
  }

  let raw: unknown;
  try {
    const text = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body ?? '';
    raw = JSON.parse(text);
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const parsed = EnquiryPayload.safeParse(raw);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const result = await intakeEnquiry(configFromEnv(), parsed.data);
    return json(result.duplicate ? 200 : 201, { reference: result.reference, duplicate: result.duplicate });
  } catch (error) {
    // 5xx makes the Pages Function fall back to the SES e-mail path, so the
    // enquiry is never lost. Log the Twenty response body for diagnosis.
    console.error('[enquiry-intake]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
