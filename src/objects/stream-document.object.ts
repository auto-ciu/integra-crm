/**
 * Stream Document — a versioned reference document for a product stream:
 * a regulation text, guidance, template, checklist or report.
 */
import { defineObject } from '../lib/sdk';
import { date, files, manyToOne, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { STREAM_DOCUMENT_TYPE } from '../options';

const F = IDS.streamDocument.fields;

export default defineObject({
  universalIdentifier: IDS.streamDocument.object,
  nameSingular: 'streamDocument',
  namePlural: 'streamDocuments',
  labelSingular: 'Stream Document',
  labelPlural: 'Stream Documents',
  description: 'Regulation, guidance, template, checklist or report for a product stream',
  icon: 'IconFileDescription',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    // Twenty's conventional `name` column (as TrainingEvent); shown as "Title".
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Title · 标题',
      icon: 'IconFileDescription',
    }),
    manyToOne({
      universalIdentifier: F.stream,
      name: 'stream',
      label: 'Stream · 产品线',
      icon: 'IconStack2',
      targetObjectId: IDS.productStream.object,
      inverseFieldId: IDS.productStream.fields.documents,
    }),
    files({
      universalIdentifier: F.file,
      name: 'file',
      label: 'File · 文件',
      icon: 'IconPaperclip',
      maxNumberOfValues: 1,
    }),
    text({
      universalIdentifier: F.version,
      name: 'version',
      label: 'Version · 版本',
      icon: 'IconVersions',
    }),
    date({
      universalIdentifier: F.effectiveDate,
      name: 'effectiveDate',
      label: 'Effective date · 生效日期',
      icon: 'IconCalendarEvent',
    }),
    select({
      universalIdentifier: F.documentType,
      name: 'documentType',
      label: 'Document type · 文件类型',
      icon: 'IconCategory',
      options: STREAM_DOCUMENT_TYPE,
    }),
  ],
});
