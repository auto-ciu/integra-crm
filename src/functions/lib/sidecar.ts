/**
 * Pieces shared by the REST sidecar (F0.3b) Lambdas: the API Gateway HTTP
 * API (payload 2.0) envelope, bearer auth, and the Person / Company helpers
 * both intakes use. Not a Twenty app entity (no define*() call).
 */
import { randomInt, timingSafeEqual } from 'node:crypto';

import { findRecords, type TwentyConfig, type TwentyRecord } from '../../../ops/lib/twenty-api';
import { companyDomainForEmail, hostMatchesDomain } from '../../../shared/icp.mjs';

// --------------------------------------------------------------------- HTTP

/** The parts of an API Gateway HTTP API (payload 2.0) event the handlers read. */
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

export const json = (statusCode: number, body: unknown): HttpResult => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export function isAuthorised(header: string | undefined, token: string | undefined): boolean {
  if (!token || !header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Method + bearer + JSON checks every intake makes. Returns the parsed body,
 * or the error response to send back.
 */
export function readAuthorisedJson(event: HttpEvent, token: string | undefined): { body: unknown } | { error: HttpResult } {
  if (event.requestContext?.http?.method && event.requestContext.http.method !== 'POST') {
    return { error: json(405, { error: 'method_not_allowed' }) };
  }
  const headers = Object.fromEntries(Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (!isAuthorised(headers.authorization, token)) {
    return { error: json(401, { error: 'unauthorised' }) };
  }
  try {
    const text = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body ?? '';
    return { body: JSON.parse(text) };
  } catch {
    return { error: json(400, { error: 'invalid_json' }) };
  }
}

// ---------------------------------------------------------------- CRM bits

/** Human-readable tokens: no 0/O, 1/I/L. */
const TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const randomToken = (length: number) =>
  Array.from({ length }, () => TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)]).join('');

export const splitName = (name: string) => {
  const [firstName, ...rest] = name.split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
};

/** Company whose website host is the sender's domain (or a subdomain of it); never by freemail. */
export async function matchCompany(config: TwentyConfig, email: string): Promise<TwentyRecord | null> {
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
