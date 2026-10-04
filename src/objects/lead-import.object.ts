/**
 * Lead Import (A2) — one CSV/XLSX batch of leads brought in by
 * src/functions/import-leads-csv.ts. Each row becomes a DiscoveredCompany
 * pointing back here (`importId`); the counts are written when the run ends.
 */
import { defineObject } from '../lib/sdk';
import { dateTime, manyToOne, number, oneToMany, richText, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { LEAD_IMPORT_SOURCE, LEAD_IMPORT_STATUS } from '../options';
import { STANDARD } from '../standard-ids';

const F = IDS.leadImport.fields;

export default defineObject({
  universalIdentifier: IDS.leadImport.object,
  nameSingular: 'leadImport',
  namePlural: 'leadImports',
  labelSingular: 'Lead Import',
  labelPlural: 'Lead Imports',
  description: 'A CSV/XLSX batch of leads, with how many rows were imported, duplicated or failed',
  icon: 'IconFileImport',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({ universalIdentifier: F.name, name: 'name', label: 'Name · 名称', icon: 'IconFileImport', description: 'e.g. "Canton Fair 2026 exhibitors"' }),
    text({ universalIdentifier: F.fileName, name: 'fileName', label: 'File name · 文件名', icon: 'IconFile' }),
    select({ universalIdentifier: F.status, name: 'status', label: 'Status · 状态', icon: 'IconProgressCheck', options: LEAD_IMPORT_STATUS, defaultValue: 'UPLOADED' }),
    number({ universalIdentifier: F.rowCount, name: 'rowCount', label: 'Rows · 行数', icon: 'IconListNumbers' }),
    number({ universalIdentifier: F.importedCount, name: 'importedCount', label: 'Imported · 已导入', icon: 'IconCircleCheck' }),
    number({ universalIdentifier: F.duplicateCount, name: 'duplicateCount', label: 'Duplicates · 重复', icon: 'IconCopy' }),
    number({ universalIdentifier: F.errorCount, name: 'errorCount', label: 'Errors · 错误', icon: 'IconAlertTriangle' }),
    select({ universalIdentifier: F.source, name: 'source', label: 'Source · 来源', icon: 'IconFileSpreadsheet', options: LEAD_IMPORT_SOURCE, defaultValue: 'CSV' }),
    manyToOne({
      universalIdentifier: F.uploadedBy,
      name: 'uploadedBy',
      label: 'Uploaded by · 上传人',
      icon: 'IconUserCircle',
      targetObjectId: STANDARD.workspaceMember.object,
      inverseFieldId: IDS.workspaceMember.fields.leadImports,
    }),
    dateTime({ universalIdentifier: F.startedAt, name: 'startedAt', label: 'Started at · 开始时间', icon: 'IconPlayerPlay' }),
    dateTime({ universalIdentifier: F.completedAt, name: 'completedAt', label: 'Completed at · 完成时间', icon: 'IconFlag' }),
    richText({ universalIdentifier: F.errorLog, name: 'errorLog', label: 'Error log · 错误日志', icon: 'IconBug' }),
    oneToMany({
      universalIdentifier: F.discoveredCompanies,
      name: 'discoveredCompanies',
      label: 'Discovered companies · 导入的公司',
      icon: 'IconBuildingFactory2',
      targetObjectId: IDS.discoveredCompany.object,
      inverseFieldId: IDS.discoveredCompany.fields.importId,
    }),
  ],
});
