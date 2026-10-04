/**
 * Stream content publishing (B3) — the one place that decides what counts as
 * a public Integra URL. Used by ops/publish-stream-content.mjs (to accept it)
 * and StreamContentWidget (to render it as a link).
 */

export const PUBLIC_DOMAIN = 'integrascientific.com';

/** The normalised URL string when `value` is an https URL on integrascientific.com (or a subdomain), else null. */
export function integraUrl(value) {
  if (typeof value !== 'string') return null;
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  return host === PUBLIC_DOMAIN || host.endsWith(`.${PUBLIC_DOMAIN}`) ? url.href : null;
}
