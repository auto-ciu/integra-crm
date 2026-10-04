/**
 * SLA policies and the e-mail-to-ticket helpers (E3) — pure, dependency-free,
 * shared by src/functions/email-to-ticket.ts, ops/seed-sla-policies.mjs and
 * verify-model.mjs.
 */

export const PRIORITIES = Object.freeze(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

/** The four default SlaPolicy records (E3 plan). Seed key = name. */
export const DEFAULT_SLA_POLICIES = Object.freeze(
  [
    ['URGENT', 1, 8],
    ['HIGH', 4, 24],
    ['NORMAL', 8, 48],
    ['LOW', 24, 96],
  ].map(([priority, firstResponseHours, resolutionHours]) =>
    Object.freeze({
      name: `${priority[0]}${priority.slice(1).toLowerCase()} priority`,
      description: `${firstResponseHours}h first response, ${resolutionHours}h resolution`,
      priority,
      firstResponseHours,
      resolutionHours,
      isActive: true,
    }),
  ),
);

/**
 * The active policy for a priority. `policies` are SlaPolicy records; falls
 * back to the built-in default so a workspace that never ran the seed still
 * gets an SLA clock.
 */
export function policyFor(priority, policies = []) {
  const fromCrm = policies.find((p) => p.priority === priority && p.isActive !== false && Number(p.firstResponseHours) > 0);
  return fromCrm ?? DEFAULT_SLA_POLICIES.find((p) => p.priority === priority) ?? DEFAULT_SLA_POLICIES.find((p) => p.priority === 'NORMAL');
}

/** ISO timestamp the first response is due by. */
export function slaTargetFor(priority, policies, from = new Date()) {
  const hours = Number(policyFor(priority, policies).firstResponseHours);
  return new Date(from.getTime() + hours * 3_600_000).toISOString();
}

// ---------------------------------------------------------------- e-mail

/** `"Li Wei" <li.wei@acme.cn>` or `li.wei@acme.cn` → { name, email }. Name is '' when absent. */
export function parseSender(from) {
  const text = String(from ?? '').trim();
  const angle = /^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/.exec(text);
  const email = (angle ? angle[2] : /^[^\s<>]+@[^\s<>]+$/.test(text) ? text : '').toLowerCase();
  const name = angle ? angle[1].trim().replace(/^["']|["']$/g, '').trim() : '';
  return { name: name && name.toLowerCase() !== email ? name : '', email };
}

/** Best-effort display name: the header's name, else the local part ("li.wei" → "Li Wei"). */
export function contactNameFor({ name, email }) {
  if (name) return name;
  const local = email.split('@')[0] ?? '';
  return local
    .split(/[._\-+]+/)
    .filter((w) => w && !/^\d+$/.test(w))
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/** `<a@b> <c@d>` / "a@b, c@d" → ['a@b', 'c@d'] (angle brackets stripped). */
export function messageIds(value) {
  const raw = Array.isArray(value) ? value.join(' ') : String(value ?? '');
  return [...new Set((raw.match(/<[^<>\s]+>|[^\s<>,]+@[^\s<>,]+/g) ?? []).map((id) => id.replace(/^<|>$/g, '')))];
}

/** ENQ-YYMMDD-XXXX in a subject ("Re: [ENQ-261003-7K2Q] …"), the fallback thread key. */
export function referenceInSubject(subject) {
  return /\bENQ-\d{6}-[A-Z0-9]{4}\b/.exec(String(subject ?? ''))?.[0] ?? null;
}

/** Subject without reply / forward prefixes. */
export const cleanSubject = (subject) =>
  String(subject ?? '').replace(/^\s*((re|fw|fwd|回复|答复|转发)\s*[:：]\s*)+/i, '').trim();

/** ZH when the text is mostly CJK, else EN. */
export function detectLanguage(text) {
  const letters = String(text ?? '').match(/[\p{L}]/gu) ?? [];
  const cjk = letters.filter((c) => /\p{Script=Han}/u.test(c)).length;
  return letters.length > 0 && cjk / letters.length > 0.2 ? 'ZH' : 'EN';
}

/**
 * Routing: the active rule with the lowest `priority` number that matches;
 * an empty category or language on a rule matches anything (same contract as
 * EnquiryRoutingRule). Returns the rule or null.
 */
export function pickRoutingRule(rules, { category, language }) {
  return (
    rules
      .filter((r) => r.isActive !== false)
      .filter((r) => (!r.category || r.category === category) && (!r.language || r.language === language))
      .sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity))[0] ?? null
  );
}

/** Status after an inbound reply: a requester answering PENDING (waiting on them) or CLOSED reopens it. */
export const statusAfterInbound = (status) => (status === 'PENDING' || status === 'CLOSED' ? 'OPEN' : status);
