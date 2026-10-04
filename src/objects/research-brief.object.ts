/**
 * Research Brief (D1-D2) — one AI market-research question: a product-category
 * topic, a scope ("EU", "Global", "China") and a depth, the exact prompt sent
 * to Claude (built by shared/research-prompts.mjs), and what came back.
 * Run by src/functions/run-research.ts; seeded by ops/seed-research-briefs.mjs.
 *
 * `topic` reuses PRODUCT_CATEGORY, the same list as the product streams.
 * BLOCKED: nothing is submitted until ANTHROPIC_API_KEY is configured, so
 * every brief is still a DRAFT. `result` is Claude's answer as given;
 * `resultJson` (structured data extracted from it) and `sourceUrls` are for
 * the live-research stage (Feature D, Managed Agents with web search).
 * `isVerified` is ticked by staff once they have checked the result against
 * the sources: AI research is not to be relied on before that.
 */
import { defineObject } from '../lib/sdk';
import { boolean, dateTime, number, richText, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { PRODUCT_CATEGORY, RESEARCH_DEPTH, RESEARCH_STATUS } from '../options';

const F = IDS.researchBrief.fields;

export default defineObject({
  universalIdentifier: IDS.researchBrief.object,
  nameSingular: 'researchBrief',
  namePlural: 'researchBriefs',
  labelSingular: 'Research Brief',
  labelPlural: 'Research Briefs',
  description: 'An AI market-research question per product category, with the prompt, answer and cost',
  icon: 'IconTelescope',
  labelIdentifierFieldMetadataUniversalIdentifier: F.title,
  fields: [
    text({
      universalIdentifier: F.title,
      name: 'title',
      label: 'Title · 标题',
      icon: 'IconTelescope',
      description: 'e.g. "Battery — Li-ion · EU · Overview"',
    }),
    select({
      universalIdentifier: F.topic,
      name: 'topic',
      label: 'Topic · 主题',
      icon: 'IconCategory',
      options: PRODUCT_CATEGORY,
    }),
    text({
      universalIdentifier: F.scope,
      name: 'scope',
      label: 'Scope · 范围',
      icon: 'IconWorld',
      description: 'EU, Global or China',
    }),
    select({
      universalIdentifier: F.depth,
      name: 'depth',
      label: 'Depth · 深度',
      icon: 'IconZoomScan',
      options: RESEARCH_DEPTH,
      defaultValue: 'OVERVIEW',
    }),
    richText({
      universalIdentifier: F.prompt,
      name: 'prompt',
      label: 'Prompt · 提示词',
      icon: 'IconMessage',
      description: 'The exact prompt sent to Claude',
    }),
    select({
      universalIdentifier: F.status,
      name: 'status',
      label: 'Status · 状态',
      icon: 'IconProgressCheck',
      options: RESEARCH_STATUS,
      defaultValue: 'DRAFT',
    }),
    richText({
      universalIdentifier: F.result,
      name: 'result',
      label: 'Result · 结果',
      icon: 'IconFileText',
      description: 'Claude\'s response, as given',
    }),
    richText({
      universalIdentifier: F.resultJson,
      name: 'resultJson',
      label: 'Result (JSON) · 结构化结果',
      icon: 'IconBraces',
      description: 'Structured data extracted from the result',
    }),
    number({
      universalIdentifier: F.costUsd,
      name: 'costUsd',
      label: 'Cost (USD) · 费用',
      icon: 'IconCurrencyDollar',
      decimals: 4,
    }),
    dateTime({
      universalIdentifier: F.submittedAt,
      name: 'submittedAt',
      label: 'Submitted at · 提交时间',
      icon: 'IconSend',
    }),
    dateTime({
      universalIdentifier: F.completedAt,
      name: 'completedAt',
      label: 'Completed at · 完成时间',
      icon: 'IconFlag',
    }),
    richText({
      universalIdentifier: F.sourceUrls,
      name: 'sourceUrls',
      label: 'Source URLs · 来源链接',
      icon: 'IconLink',
      description: 'URLs the result cites',
    }),
    boolean({
      universalIdentifier: F.isVerified,
      name: 'isVerified',
      label: 'Verified · 已核实',
      icon: 'IconRosetteDiscountCheck',
      description: 'Ticked once staff have checked the result against its sources',
    }),
  ],
});
