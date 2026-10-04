/**
 * E2 automated enquiry replies. Single source of truth for:
 *   - ops/seed-reply-templates.mjs    (creates one ReplyTemplate record each)
 *   - src/functions/send-auto-reply.ts (template choice + rendering)
 *   - verify-model.mjs                (coverage + fallback order)
 *
 * A template's `category` is an ENQUIRY_CATEGORY value or ALL; its `language`
 * is EN, ZH or ALL. ALL is the catch-all. Placeholders: `{{reference}}` in the
 * subject; `{{reference}}`, `{{name}}`, `{{company}}`, `{{category}}` in the
 * body. Plain ESM so the ops script and the static check need no build.
 */

export const ALL = 'ALL';

export const REPLY_TEMPLATE_CATEGORIES = Object.freeze(['DPP', 'AR', 'TRAINING', 'AUTHORITIES', 'OTHER', ALL]);
export const REPLY_TEMPLATE_LANGUAGES = Object.freeze(['EN', 'ZH', ALL]);
export const PLACEHOLDERS = Object.freeze(['reference', 'name', 'company', 'category']);

/** What `{{category}}` renders as, per reply language. */
export const CATEGORY_TEXT = Object.freeze({
  EN: {
    DPP: 'Digital Product Passports (DPP)',
    AR: 'EU Authorised Representative services',
    TRAINING: 'training',
    AUTHORITIES: 'regulatory authority matters',
    OTHER: 'a general enquiry',
  },
  ZH: {
    DPP: '数字产品护照（DPP）',
    AR: '欧盟授权代表服务',
    TRAINING: '培训',
    AUTHORITIES: '监管事务',
    OTHER: '一般咨询',
  },
});

/** Used when the requester left a value blank. */
const FALLBACK = Object.freeze({
  EN: { name: 'Sir or Madam', company: 'your company' },
  ZH: { name: '客户', company: '贵公司' },
});

const enBody = (line) =>
  `Dear {{name}},

Thank you for contacting Integra Scientific about {{category}} on behalf of {{company}}. Your reference is **{{reference}}**; please quote it in any reply.

${line}

Best regards,
Integra Scientific`;

const zhBody = (line) =>
  `尊敬的{{name}}：

感谢您代表{{company}}就{{category}}联系Integra Scientific。您的咨询编号为 **{{reference}}**，回复时请注明。

${line}

此致
Integra Scientific`;

/**
 * The seed: five categories × EN/ZH. "Other" is seeded as the ALL catch-all,
 * so it also answers OTHER enquiries and any category without its own
 * template. `name` is the seed key (ops/seed-reply-templates.mjs).
 */
export const REPLY_TEMPLATES = Object.freeze(
  [
    {
      name: 'DPP · EN',
      category: 'DPP',
      language: 'EN',
      subject: "Thank you for your DPP enquiry ({{reference}}) — we'll respond within 1 business day",
      body: enBody('A member of our Digital Product Passport team will respond within 1 business day.'),
    },
    {
      name: 'DPP · ZH',
      category: 'DPP',
      language: 'ZH',
      subject: '感谢您的DPP咨询 ({{reference}}) — 我们将在1个工作日内回复',
      body: zhBody('我们的数字产品护照团队将在1个工作日内回复您。'),
    },
    {
      name: 'AR · EN',
      category: 'AR',
      language: 'EN',
      subject: 'Thank you for your AR enquiry ({{reference}}) — your EU Representative question will be answered shortly',
      body: enBody('Our EU Authorised Representative team will answer your question shortly.'),
    },
    {
      name: 'AR · ZH',
      category: 'AR',
      language: 'ZH',
      subject: '感谢您的AR咨询 ({{reference}}) — 欧盟授权代表团队将尽快回复',
      body: zhBody('我们的欧盟授权代表团队将尽快回复您的问题。'),
    },
    {
      name: 'Training · EN',
      category: 'TRAINING',
      language: 'EN',
      subject: 'Thank you for your training enquiry ({{reference}}) — course details coming soon',
      body: enBody('We will send you course details, dates and formats soon.'),
    },
    {
      name: 'Training · ZH',
      category: 'TRAINING',
      language: 'ZH',
      subject: '感谢您的培训咨询 ({{reference}}) — 课程详情将尽快发送',
      body: zhBody('我们将尽快向您发送课程详情、日期和形式。'),
    },
    {
      name: 'Authorities · EN',
      category: 'AUTHORITIES',
      language: 'EN',
      subject: 'Thank you for contacting Integra ({{reference}}) — your enquiry has been forwarded to our regulatory team',
      body: enBody('Your enquiry has been forwarded to our regulatory team, who will be in touch.'),
    },
    {
      name: 'Authorities · ZH',
      category: 'AUTHORITIES',
      language: 'ZH',
      subject: '感谢您联系Integra ({{reference}}) — 您的咨询已转交法规团队',
      body: zhBody('您的咨询已转交我们的法规团队，他们将与您联系。'),
    },
    {
      name: 'Other (catch-all) · EN',
      category: ALL,
      language: 'EN',
      subject: "Thank you for contacting Integra Scientific ({{reference}}) — we'll get back to you within 2 business days",
      body: enBody('We will get back to you within 2 business days.'),
    },
    {
      name: 'Other (catch-all) · ZH',
      category: ALL,
      language: 'ZH',
      subject: '感谢您联系Integra Scientific ({{reference}}) — 我们将在2个工作日内回复',
      body: zhBody('我们将在2个工作日内回复您。'),
    },
  ].map((t, sortOrder) => Object.freeze({ ...t, isActive: true, sortOrder })),
);

/** Blank / missing select → ALL, the way routing rules treat an empty value. */
const orAll = (value) => (value === null || value === undefined || value === '' ? ALL : value);

/**
 * How well a template fits, lower is better; null when it does not apply.
 *   0  exact category + exact language
 *   1  ALL category, exact language
 *   2  exact category, ALL language
 *   3  ALL category, ALL language
 * Language outranks category: a generic reply in the requester's language
 * beats a specific one in the wrong language.
 */
export function matchRank(template, category, language) {
  const c = orAll(template.category);
  const l = orAll(template.language);
  const catExact = c === category;
  const langExact = l === language;
  if (!(catExact || c === ALL) || !(langExact || l === ALL)) return null;
  if (catExact && langExact) return 0;
  if (langExact) return 1;
  if (catExact) return 2;
  return 3;
}

/**
 * The best active template for an enquiry, or null. Ties go to the lowest
 * sortOrder (unset last), then name.
 */
export function selectTemplate(templates, { category, language }) {
  const ranked = templates
    .filter((t) => t.isActive !== false)
    .map((t) => ({ t, rank: matchRank(t, category, language) }))
    .filter((r) => r.rank !== null);
  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      (a.t.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.t.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
      String(a.t.name ?? '').localeCompare(String(b.t.name ?? '')),
  );
  return ranked[0]?.t ?? null;
}

/** Values for the placeholders, single-line, with blanks filled per language. */
export function templateValues({ reference, name, company, category, language }) {
  const lang = language === 'ZH' ? 'ZH' : 'EN';
  const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
  return {
    reference: clean(reference),
    name: clean(name) || FALLBACK[lang].name,
    company: clean(company) || FALLBACK[lang].company,
    category: CATEGORY_TEXT[lang][category] ?? CATEGORY_TEXT[lang].OTHER,
  };
}

/** Replace known `{{placeholder}}`s; unknown ones are left as typed so staff can spot them. */
export function renderTemplate(text, values) {
  return String(text ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match,
  );
}
