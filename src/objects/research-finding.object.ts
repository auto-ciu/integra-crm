/**
 * Research Finding (D1-D2) — one item from a report's findings.json. HIGH
 * importance findings get a Twenty Task (`isTaskCreated`, `taskId`) assigned
 * to `suggestedOwner` or the stream owner. Created by research-ingest.ts.
 */
import { defineObject } from '../lib/sdk';
import { boolean, date, manyToOne, richText, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import { FINDING_CATEGORY, FINDING_IMPORTANCE } from '../options';

const F = IDS.researchFinding.fields;

export default defineObject({
  universalIdentifier: IDS.researchFinding.object,
  nameSingular: 'researchFinding',
  namePlural: 'researchFindings',
  labelSingular: 'Research Finding',
  labelPlural: 'Research Findings',
  description: 'One cited finding from a research report',
  icon: 'IconBulb',
  labelIdentifierFieldMetadataUniversalIdentifier: F.title,
  fields: [
    text({
      universalIdentifier: F.title,
      name: 'title',
      label: 'Title · 标题',
      icon: 'IconBulb',
    }),
    manyToOne({
      universalIdentifier: F.report,
      name: 'report',
      label: 'Report · 报告',
      icon: 'IconReport',
      targetObjectId: IDS.researchReport.object,
      inverseFieldId: IDS.researchReport.fields.findings,
    }),
    manyToOne({
      universalIdentifier: F.brief,
      name: 'brief',
      label: 'Brief · 简报',
      icon: 'IconTelescope',
      targetObjectId: IDS.researchBrief.object,
      inverseFieldId: IDS.researchBrief.fields.findings,
    }),
    richText({
      universalIdentifier: F.body,
      name: 'body',
      label: 'Body · 内容',
      icon: 'IconFileText',
    }),
    select({
      universalIdentifier: F.category,
      name: 'category',
      label: 'Category · 类别',
      icon: 'IconCategory',
      options: FINDING_CATEGORY,
      defaultValue: 'OTHER',
    }),
    select({
      universalIdentifier: F.importance,
      name: 'importance',
      label: 'Importance · 重要性',
      icon: 'IconFlag',
      options: FINDING_IMPORTANCE,
      defaultValue: 'MEDIUM',
    }),
    text({
      universalIdentifier: F.sourceUrls,
      name: 'sourceUrls',
      label: 'Source URLs · 来源链接',
      icon: 'IconLink',
      description: 'One URL per line',
    }),
    date({
      universalIdentifier: F.publicationDate,
      name: 'publicationDate',
      label: 'Published · 发布日期',
      icon: 'IconCalendar',
    }),
    boolean({
      universalIdentifier: F.isCited,
      name: 'isCited',
      label: 'Cited · 已引用',
      icon: 'IconQuote',
      description: 'Used in a digest or customer-facing text',
    }),
    boolean({
      universalIdentifier: F.isTaskCreated,
      name: 'isTaskCreated',
      label: 'Task created · 已建任务',
      icon: 'IconChecklist',
    }),
    text({
      universalIdentifier: F.taskId,
      name: 'taskId',
      label: 'Task ID',
      icon: 'IconKey',
      description: 'Twenty Task UUID',
    }),
    manyToOne({
      universalIdentifier: F.suggestedOwner,
      name: 'suggestedOwner',
      label: 'Suggested owner · 建议负责人',
      icon: 'IconUserCircle',
      targetObjectId: STANDARD.workspaceMember.object,
      inverseFieldId: IDS.workspaceMember.fields.suggestedResearchFindings,
    }),
  ],
});
