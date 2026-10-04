/**
 * Cron-or-manual trigger for the research functions. A scheduled invocation
 * (EventBridge: no HTTP envelope) is trusted; anything that looks like an
 * HTTP request must carry the bearer OPS_TOKEN and a JSON object body (or none).
 */
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './sidecar';

export function readTrigger(event: HttpEvent | undefined, token: string | undefined): { body: unknown } | { error: HttpResult } {
  const viaHttp = Boolean(event?.requestContext?.http || event?.headers);
  if (!viaHttp) return { body: {} };
  const request = readAuthorisedJson({ ...event, body: event?.body || '{}' }, token);
  if ('error' in request) return request;
  if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body)) {
    return { error: json(400, { error: 'invalid_payload' }) };
  }
  return request;
}
