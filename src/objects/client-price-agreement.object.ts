/**
 * Client Price Agreement (C2) — the prices Integra has agreed with one client:
 * custom, volume, training-bundle or mandate pricing, as Agreement Lines
 * against the Offerings / Price Points of the price list.
 *
 * `agreementCode` (CPA-2026-001) is the stable key: the quote number and the
 * pricing-preview branch (ops/trigger-preview.mjs) are built from it.
 * validate-agreement-discounts checks the lines against the Discount Rules
 * (the Validation tab's button calls it).
 *
 * The staff member who drew it up is `preparedBy`, not `createdBy`: Twenty
 * gives every object a `createdBy` system field (the actor), and an app field
 * may not take the name.
 */
import { defineObject } from '../lib/sdk';
import { date, dateTime, manyToOne, oneToMany, richText, select, text, uniqueText } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import { AGREEMENT_STATUS, AGREEMENT_TYPE } from '../options';

const F = IDS.clientPriceAgreement.fields;

export default defineObject({
  universalIdentifier: IDS.clientPriceAgreement.object,
  nameSingular: 'clientPriceAgreement',
  namePlural: 'clientPriceAgreements',
  labelSingular: 'Client Price Agreement',
  labelPlural: 'Client Price Agreements',
  description: 'Prices agreed with one client: custom, volume, training-bundle or mandate pricing',
  icon: 'IconFileDollar',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconFileDollar',
    }),
    uniqueText({
      universalIdentifier: F.agreementCode,
      name: 'agreementCode',
      label: 'Agreement code · 协议编号',
      icon: 'IconKey',
      description: 'Stable key, e.g. CPA-2026-001: the quote number and the pricing-preview branch',
    }),
    manyToOne({
      universalIdentifier: F.client,
      name: 'client',
      label: 'Client · 客户',
      icon: 'IconBuildingSkyscraper',
      targetObjectId: STANDARD.company.object,
      inverseFieldId: IDS.company.fields.clientPriceAgreements,
    }),
    manyToOne({
      universalIdentifier: F.contact,
      name: 'contact',
      label: 'Contact · 联系人',
      icon: 'IconUser',
      targetObjectId: STANDARD.person.object,
      inverseFieldId: IDS.person.fields.clientPriceAgreements,
    }),
    manyToOne({
      universalIdentifier: F.opportunity,
      name: 'opportunity',
      label: 'Opportunity · 商机',
      icon: 'IconTargetArrow',
      targetObjectId: STANDARD.opportunity.object,
      inverseFieldId: IDS.opportunity.fields.clientPriceAgreements,
    }),
    select({
      universalIdentifier: F.status,
      name: 'status',
      label: 'Status · 状态',
      icon: 'IconProgressCheck',
      options: AGREEMENT_STATUS,
      defaultValue: 'DRAFT',
    }),
    select({
      universalIdentifier: F.agreementType,
      name: 'agreementType',
      label: 'Agreement type · 协议类型',
      icon: 'IconCategory',
      options: AGREEMENT_TYPE,
      defaultValue: 'STANDARD_PRICING',
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
      description: 'Empty = open-ended',
    }),
    dateTime({
      universalIdentifier: F.signedAt,
      name: 'signedAt',
      label: 'Signed at · 签署时间',
      icon: 'IconSignature',
    }),
    manyToOne({
      universalIdentifier: F.signedBy,
      name: 'signedBy',
      label: 'Signed by · 签署人',
      icon: 'IconUserCheck',
      description: 'The client-side signatory',
      targetObjectId: STANDARD.person.object,
      inverseFieldId: IDS.person.fields.signedClientPriceAgreements,
    }),
    manyToOne({
      universalIdentifier: F.preparedBy,
      name: 'preparedBy',
      label: 'Prepared by · 制定人',
      icon: 'IconUserCircle',
      description: 'The Integra staff member who drew it up (Twenty reserves createdBy)',
      targetObjectId: STANDARD.workspaceMember.object,
      inverseFieldId: IDS.workspaceMember.fields.preparedClientPriceAgreements,
    }),
    richText({
      universalIdentifier: F.notes,
      name: 'notes',
      label: 'Notes · 备注',
      icon: 'IconNotes',
    }),
    oneToMany({
      universalIdentifier: F.lines,
      name: 'lines',
      label: 'Lines · 协议明细',
      icon: 'IconListDetails',
      targetObjectId: IDS.agreementLine.object,
      inverseFieldId: IDS.agreementLine.fields.agreement,
    }),
  ],
});
