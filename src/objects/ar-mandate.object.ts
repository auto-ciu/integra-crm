/**
 * AR Mandate — the annual EU Authorised Representative mandate a Chinese
 * manufacturer signs with Integra. Document-heavy, high-trust, and the object
 * whose renewal clock the whole CRM is built to make visible.
 *
 * Object labels stay English-only: the e2e sidebar matcher is anchored
 * (`^ar mandates?$`), so a bilingual plural label would break the journey.
 */
import { defineObject } from '../lib/sdk';
import { currency, date, files, manyToOne, oneToMany, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import { MANDATE_STATUS, URGENCY } from '../options';

const F = IDS.arMandate.fields;

export default defineObject({
  universalIdentifier: IDS.arMandate.object,
  nameSingular: 'arMandate',
  namePlural: 'arMandates',
  labelSingular: 'AR Mandate',
  labelPlural: 'AR Mandates',
  description: 'EU Authorised Representative mandate (annual) with a manufacturer',
  icon: 'IconFileCertificate',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconFileCertificate',
    }),
    manyToOne({
      universalIdentifier: F.company,
      name: 'company',
      label: 'Company · 公司',
      icon: 'IconBuildingSkyscraper',
      targetObjectId: STANDARD.company.object,
      inverseFieldId: IDS.company.fields.arMandates,
    }),
    select({
      universalIdentifier: F.status,
      name: 'status',
      label: 'Status · 状态',
      icon: 'IconProgressCheck',
      options: MANDATE_STATUS,
      defaultValue: 'DRAFT',
    }),
    date({
      universalIdentifier: F.startDate,
      name: 'startDate',
      label: 'Start date · 起始日期',
      icon: 'IconCalendarEvent',
    }),
    date({
      universalIdentifier: F.endDate,
      name: 'endDate',
      label: 'End date · 结束日期',
      icon: 'IconCalendarOff',
    }),
    date({
      universalIdentifier: F.renewalDate,
      name: 'renewalDate',
      label: 'Renewal date · 续约日期',
      icon: 'IconCalendarRepeat',
      description: 'Drives urgency and the Today dashboard renewal count',
    }),
    text({
      universalIdentifier: F.docusignEnvelopeId,
      name: 'docusignEnvelopeId',
      label: 'DocuSign envelope ID',
      icon: 'IconSignature',
    }),
    currency({
      universalIdentifier: F.annualFee,
      name: 'annualFee',
      label: 'Annual fee · 年费',
      icon: 'IconCoinEuro',
      currencyCode: 'EUR',
    }),
    text({
      universalIdentifier: F.signatory,
      name: 'signatory',
      label: 'Signatory · 签署人',
      icon: 'IconUserCheck',
    }),
    select({
      universalIdentifier: F.urgency,
      name: 'urgency',
      label: 'Urgency · 紧急度',
      icon: 'IconAlarm',
      description: 'Computed nightly from Renewal date by ops/nightly-status.mjs — do not hand-edit',
      options: URGENCY,
      defaultValue: 'NONE',
    }),
    files({
      universalIdentifier: F.documents,
      name: 'documents',
      label: 'Documents · 文件',
      icon: 'IconFolder',
      description: 'Signed mandate, declarations of conformity, technical file index',
    }),
    oneToMany({
      universalIdentifier: F.products,
      name: 'products',
      label: 'Products covered · 覆盖产品',
      icon: 'IconPackages',
      targetObjectId: IDS.mandateProduct.object,
      inverseFieldId: IDS.mandateProduct.fields.arMandate,
    }),
    oneToMany({
      universalIdentifier: F.opportunityLines,
      name: 'opportunityLines',
      label: 'Opportunity lines · 商机明细',
      icon: 'IconListDetails',
      description: 'Pipeline lines pricing this mandate (link-mandate-pricing)',
      targetObjectId: IDS.opportunityLine.object,
      inverseFieldId: IDS.opportunityLine.fields.arMandate,
    }),
  ],
});
