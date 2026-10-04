/**
 * Lead Discovery Run — one Apify run of `harvestapi/linkedin-company` (A2).
 * Started by src/functions/run-linkedin-discovery.ts (status RUNNING, Apify
 * run id, the query as JSON with the actor build for provenance), finished by
 * src/functions/apify-webhook.ts (counts, actual cost, COMPLETED / FAILED).
 *
 * `runId` is the Apify run id and the webhook's lookup key, so it is unique.
 */
import { defineObject } from '../lib/sdk';
import { dateTime, number, oneToMany, richText, select, text, uniqueText } from '../lib/fields';
import { IDS } from '../ids';
import { DISCOVERY_RUN_STATUS, DISCOVERY_SOURCE } from '../options';

const F = IDS.leadDiscoveryRun.fields;

export default defineObject({
  universalIdentifier: IDS.leadDiscoveryRun.object,
  nameSingular: 'leadDiscoveryRun',
  namePlural: 'leadDiscoveryRuns',
  labelSingular: 'Lead Discovery Run',
  labelPlural: 'Lead Discovery Runs',
  description: 'One LinkedIn company lookup run on Apify, with its cost and what it found',
  icon: 'IconRadar',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconRadar',
      description: 'e.g. "Battery EU exporters Q4 2026"',
    }),
    select({
      universalIdentifier: F.status,
      name: 'status',
      label: 'Status · 状态',
      icon: 'IconProgressCheck',
      options: DISCOVERY_RUN_STATUS,
      defaultValue: 'QUEUED',
    }),
    select({
      universalIdentifier: F.source,
      name: 'source',
      label: 'Source · 来源',
      icon: 'IconBrandLinkedin',
      options: DISCOVERY_SOURCE,
      defaultValue: 'APIFY_LINKEDIN',
    }),
    richText({
      universalIdentifier: F.query,
      name: 'query',
      label: 'Query · 查询参数',
      icon: 'IconSearch',
      description: 'Search parameters as JSON, with the actor and build used',
    }),
    number({
      universalIdentifier: F.resultsCount,
      name: 'resultsCount',
      label: 'Results · 结果数',
      icon: 'IconListNumbers',
      description: 'Discovered companies imported from this run (duplicates included)',
    }),
    number({
      universalIdentifier: F.resultsNew,
      name: 'resultsNew',
      label: 'New companies · 新公司',
      icon: 'IconSparkles',
      description: 'Imported companies not seen before (not flagged as duplicates)',
    }),
    number({
      universalIdentifier: F.costUsd,
      name: 'costUsd',
      label: 'Cost (USD) · 费用',
      icon: 'IconCurrencyDollar',
      decimals: 4,
      description: 'Estimate while running; what Apify charged once finished',
    }),
    uniqueText({
      universalIdentifier: F.runId,
      name: 'runId',
      label: 'Apify run ID',
      icon: 'IconHash',
    }),
    dateTime({
      universalIdentifier: F.startedAt,
      name: 'startedAt',
      label: 'Started at · 开始时间',
      icon: 'IconPlayerPlay',
    }),
    dateTime({
      universalIdentifier: F.completedAt,
      name: 'completedAt',
      label: 'Completed at · 完成时间',
      icon: 'IconFlag',
    }),
    text({
      universalIdentifier: F.errorMessage,
      name: 'errorMessage',
      label: 'Error · 错误',
      icon: 'IconAlertTriangle',
    }),
    oneToMany({
      universalIdentifier: F.discoveredCompanies,
      name: 'discoveredCompanies',
      label: 'Discovered companies · 发现的公司',
      icon: 'IconBuildingFactory2',
      targetObjectId: IDS.discoveredCompany.object,
      inverseFieldId: IDS.discoveredCompany.fields.discoveryRun,
    }),
  ],
});
