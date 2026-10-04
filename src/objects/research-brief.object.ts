/**
 * Research Brief (D1-D2) — one AI market-research question: a product-category
 * topic, a scope ("EU", "Global", "China") and a depth, the exact prompt sent
 * to Claude (built by shared/research-prompts.mjs), and what came back.
 * Run by src/functions/research-scheduler.ts (Claude Managed Agents); seeded by ops/seed-research-briefs.mjs.
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
import { boolean, dateTime, number, oneToMany, richText, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
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
    richText({
      universalIdentifier: F.focusAreas,
      name: 'focusAreas',
      label: 'Focus areas · 研究重点',
      icon: 'IconTarget',
      description: 'What the agent should research',
    }),
    richText({
      universalIdentifier: F.competitorWatchlist,
      name: 'competitorWatchlist',
      label: 'Competitor watchlist · 竞争对手清单',
      icon: 'IconSwords',
      description: 'Competitors to track',
    }),
    richText({
      universalIdentifier: F.regulatoryWatchlist,
      name: 'regulatoryWatchlist',
      label: 'Regulatory watchlist · 法规清单',
      icon: 'IconGavel',
      description: 'Regulations to monitor',
    }),
    number({
      universalIdentifier: F.cadenceDays,
      name: 'cadenceDays',
      label: 'Cadence (days) · 周期',
      icon: 'IconRepeat',
      description: 'Days between runs, e.g. 7 for weekly',
    }),
    oneToMany({
      universalIdentifier: F.subscribers,
      name: 'subscribers',
      label: 'Subscribers · 订阅者',
      icon: 'IconUsers',
      description: 'Workspace members who get the digest. A member can follow one brief (Twenty has no many-to-many yet)',
      targetObjectId: STANDARD.workspaceMember.object,
      inverseFieldId: IDS.workspaceMember.fields.subscribedResearchBrief,
    }),
    dateTime({
      universalIdentifier: F.lastRunAt,
      name: 'lastRunAt',
      label: 'Last run · 上次运行',
      icon: 'IconHistory',
    }),
    dateTime({
      universalIdentifier: F.nextRunAt,
      name: 'nextRunAt',
      label: 'Next run · 下次运行',
      icon: 'IconCalendarClock',
    }),
    text({
      universalIdentifier: F.agentId,
      name: 'agentId',
      label: 'Agent ID',
      icon: 'IconRobot',
      description: 'Managed Agents agent ID, set once by the setup script',
    }),
    text({
      universalIdentifier: F.systemPromptVersion,
      name: 'systemPromptVersion',
      label: 'System prompt version',
      icon: 'IconGitCommit',
      description: 'SHA of research/agent.md the agent was created from',
    }),
    oneToMany({
      universalIdentifier: F.reports,
      name: 'reports',
      label: 'Reports · 报告',
      icon: 'IconReport',
      targetObjectId: IDS.researchReport.object,
      inverseFieldId: IDS.researchReport.fields.brief,
    }),
    oneToMany({
      universalIdentifier: F.findings,
      name: 'findings',
      label: 'Findings · 发现',
      icon: 'IconBulb',
      targetObjectId: IDS.researchFinding.object,
      inverseFieldId: IDS.researchFinding.fields.brief,
    }),
  ],
});
