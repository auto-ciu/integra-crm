/**
 * Reply Template — the automatic first reply to a new enquiry (E2), one per
 * category × language. send-auto-reply picks the best active match (exact,
 * then ALL category, then ALL language — shared/reply-templates.mjs) and
 * records the rendered reply as an OUTBOUND Enquiry Message.
 *
 * Placeholders: {{reference}} in the subject; {{reference}}, {{name}},
 * {{company}} and {{category}} in the body. ops/seed-reply-templates.mjs
 * creates the ten bilingual defaults.
 */
import { defineObject } from '../lib/sdk';
import { boolean, number, richText, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { REPLY_TEMPLATE_CATEGORY, REPLY_TEMPLATE_LANGUAGE } from '../options';

const F = IDS.replyTemplate.fields;

export default defineObject({
  universalIdentifier: IDS.replyTemplate.object,
  nameSingular: 'replyTemplate',
  namePlural: 'replyTemplates',
  labelSingular: 'Reply Template',
  labelPlural: 'Reply Templates',
  description: 'Automatic first reply to new enquiries, by category and language',
  icon: 'IconMailForward',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconMailForward',
      description: 'e.g. "DPP · EN" (the seed key)',
    }),
    select({
      universalIdentifier: F.category,
      name: 'category',
      label: 'Category · 类别',
      icon: 'IconCategory',
      options: REPLY_TEMPLATE_CATEGORY,
      defaultValue: 'ALL',
    }),
    select({
      universalIdentifier: F.language,
      name: 'language',
      label: 'Language · 语言',
      icon: 'IconLanguage',
      options: REPLY_TEMPLATE_LANGUAGE,
      defaultValue: 'ALL',
    }),
    text({
      universalIdentifier: F.subject,
      name: 'subject',
      label: 'Subject · 主题',
      icon: 'IconMail',
      description: 'Supports {{reference}}',
    }),
    richText({
      universalIdentifier: F.body,
      name: 'body',
      label: 'Body · 内容',
      icon: 'IconFileText',
      description: 'Supports {{reference}}, {{name}}, {{company}}, {{category}}',
    }),
    boolean({
      universalIdentifier: F.isActive,
      name: 'isActive',
      label: 'Active · 启用',
      icon: 'IconToggleRight',
      defaultValue: true,
    }),
    number({
      universalIdentifier: F.sortOrder,
      name: 'sortOrder',
      label: 'Sort order · 排序',
      icon: 'IconSortAscendingNumbers',
      description: 'Breaks ties between equally good matches; lower wins',
    }),
  ],
});
