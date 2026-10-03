/**
 * Company-matching helpers shared by enquiry intake (and later Feature A's
 * lead import). Plain ESM, dependency-free, so verify-model.mjs and the
 * sidecar can both import it.
 */

/**
 * Webmail domains: an address here says nothing about the sender's company,
 * so intake must not match a Company by it. Chinese providers first — most
 * enquiries from manufacturers' staff arrive from these.
 */
export const FREEMAIL_DOMAINS = Object.freeze([
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'foxmail.com',
  'yeah.net',
  'aliyun.com',
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
]);

const FREEMAIL = new Set(FREEMAIL_DOMAINS);

/** Lower-cased domain of an e-mail address, or null if there is none. */
export function emailDomain(email) {
  if (typeof email !== 'string') return null;
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

export function isFreemailDomain(domain) {
  return typeof domain === 'string' && FREEMAIL.has(domain.toLowerCase());
}

/**
 * Domain to match a Company by, or null for freemail / unparsable addresses.
 * `mail.acme.cn` is NOT reduced to `acme.cn` — matching is exact or on a
 * Company whose website host ends with `.<domain>` (see hostMatchesDomain).
 */
export function companyDomainForEmail(email) {
  const domain = emailDomain(email);
  return domain && !isFreemailDomain(domain) ? domain : null;
}

/**
 * True when a Company website (`https://www.acme.com/en`, `acme.com`) belongs
 * to `domain` (`acme.com`): same host, or a subdomain of it.
 */
export function hostMatchesDomain(url, domain) {
  if (typeof url !== 'string' || !url || !domain) return false;
  let host;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return false;
  }
  host = host.replace(/^www\./, '');
  return host === domain || host.endsWith(`.${domain}`);
}
