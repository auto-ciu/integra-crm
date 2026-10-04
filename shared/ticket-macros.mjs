/**
 * Ticket macros (E3) — the default saved responses seeded by
 * ops/seed-ticket-macros.mjs, and how a macro becomes a reply. Pure and
 * dependency-free: the Macros tab (front component), the seed and
 * verify-model.mjs all use it.
 *
 * Placeholders: {{reference}}, {{name}}, {{company}} (same rendering as the
 * E2 auto-reply: shared/reply-templates.mjs).
 */
import { renderTemplate, templateValues } from './reply-templates.mjs';

export const MACRO_CATEGORIES = Object.freeze(['RESPONSE', 'INTERNAL_ACTION', 'BOTH']);

export const SIGNATURE = Object.freeze({
  EN: '--\nIntegra Scientific\nsupport@integrascientific.com',
  ZH: '--\nIntegra Scientific 团队\nsupport@integrascientific.com',
});

const hello = { EN: 'Hello {{name}},', ZH: '{{name}}，您好：' };

const M = (name, shortcut, language, text) => ({
  name: `${name} · ${language}`,
  shortcut: `${shortcut}-${language.toLowerCase()}`,
  language,
  responseTemplate: `${hello[language]}\n\n${text}`,
  category: 'RESPONSE',
  appendSignature: true,
  productCategory: null,
  serviceInterest: null,
});

/** Seed key = name. Every macro exists in EN and ZH. */
export const TICKET_MACROS = Object.freeze(
  [
    M('Acknowledge receipt', 'ack', 'EN', "Thank you for contacting Integra Scientific. We've received your enquiry ({{reference}}) and will get back to you within 24 hours."),
    M('Acknowledge receipt', 'ack', 'ZH', '感谢您联系 Integra Scientific。我们已收到您的咨询（编号 {{reference}}），将在 24 小时内回复您。'),
    M('Canton Fair follow-up', 'canton', 'EN', "It was great meeting you at the Canton Fair. Here's the information we discussed regarding {{company}}:\n\n- "),
    M('Canton Fair follow-up', 'canton', 'ZH', '很高兴在广交会上与您见面。以下是我们就 {{company}} 讨论的相关资料：\n\n- '),
    M('Request more info', 'info', 'EN', 'To help us better understand your needs, could you please provide:\n\n- Your product type and the markets you sell into\n- Your timeline and any regulatory deadlines you are working to\n- Any existing documentation you already have'),
    M('Request more info', 'info', 'ZH', '为了更好地了解您的需求，请您提供以下信息：\n\n- 产品类型及销售市场\n- 时间安排及需要满足的法规截止日期\n- 您已有的相关文件'),
    M('Schedule call', 'call', 'EN', 'Would you like to schedule a call to discuss this in more detail? Please let us know a few times that suit you, and your time zone.'),
    M('Schedule call', 'call', 'ZH', '您是否方便安排一次通话，详细讨论此事？请告知几个您方便的时间及所在时区。'),
  ].map((m) => Object.freeze(m)),
);

/** A macro applies when its optional filters are empty or equal the enquiry's category. */
export const macroApplies = (macro, { category }) =>
  (!macro.serviceInterest || macro.serviceInterest === category) && macro.category !== 'INTERNAL_ACTION';

/** Rendered reply markdown for an enquiry (signature appended when the macro asks for it). */
export function renderMacro(macro, { reference, name, company, category, language }) {
  const lang = language === 'ZH' ? 'ZH' : 'EN';
  const body = renderTemplate(macro.responseTemplate, templateValues({ reference, name, company, category, language: lang })).trim();
  return macro.appendSignature ? `${body}\n\n${SIGNATURE[lang]}` : body;
}
