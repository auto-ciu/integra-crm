/**
 * Research Report (D1-D2) — one run of a ResearchBrief on Claude Managed
 * Agents. Created RUNNING by src/functions/research-scheduler.ts with the
 * session's id; research-ingest.ts moves it INGESTING → READY (or FAILED)
 * once the session is idle or terminated and findings.json has been read.
 */
import { defineObject } from '../lib/sdk';
import { dateTime, link, manyToOne, number, oneToMany, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { REPORT_STATUS } from '../options';

const F = IDS.researchReport.fields;

export default defineObject({
  universalIdentifier: IDS.researchReport.object,
  nameSingular: 'researchReport',
  namePlural: 'researchReports',
  labelSingular: 'Research Report',
  labelPlural: 'Research Reports',
  description: 'One Managed Agents run of a research brief, with its cost and findings',
  icon: 'IconReport',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Report · 报告',
      icon: 'IconReport',
      description: '"<brief title> — <date>", set by the scheduler',
    }),
    manyToOne({
      universalIdentifier: F.brief,
      name: 'brief',
      label: 'Brief · 简报',
      icon: 'IconTelescope',
      targetObjectId: IDS.researchBrief.object,
      inverseFieldId: IDS.researchBrief.fields.reports,
    }),
    select({
      universalIdentifier: F.status,
      name: 'status',
      label: 'Status · 状态',
      icon: 'IconProgressCheck',
      options: REPORT_STATUS,
      defaultValue: 'RUNNING',
    }),
    text({
      universalIdentifier: F.sessionId,
      name: 'sessionId',
      label: 'Session ID',
      icon: 'IconRobot',
      description: 'Managed Agents session ID',
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
    number({
      universalIdentifier: F.costUsd,
      name: 'costUsd',
      label: 'Cost (USD) · 费用',
      icon: 'IconCurrencyDollar',
      decimals: 2,
    }),
    number({
      universalIdentifier: F.findingsCount,
      name: 'findingsCount',
      label: 'Findings · 发现数',
      icon: 'IconBulb',
    }),
    link({
      universalIdentifier: F.reportUrl,
      name: 'reportUrl',
      label: 'Report file · 报告文件',
      icon: 'IconFileDownload',
      description: 'Link to report.md in Managed Agents',
    }),
    text({
      universalIdentifier: F.errorMessage,
      name: 'errorMessage',
      label: 'Error · 错误',
      icon: 'IconAlertTriangle',
    }),
    oneToMany({
      universalIdentifier: F.findings,
      name: 'findings',
      label: 'Findings · 发现',
      icon: 'IconBulb',
      targetObjectId: IDS.researchFinding.object,
      inverseFieldId: IDS.researchFinding.fields.report,
    }),
  ],
});
