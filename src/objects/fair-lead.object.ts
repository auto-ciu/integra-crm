/**
 * Fair Lead — one visitor captured at a fair (B1 card capture). Created by
 * src/functions/fair-lead-intake.ts from the mobile capture form, together
 * with (or matched to) a Person; scored by src/functions/score-fair-lead.ts
 * (A1 stub).
 *
 * `scanId` is the QR-code / short-URL token the form submits, and intake's
 * idempotency key, so it is the label identifier. `capturedAt` is the form's
 * capture time; it is not called `createdAt`, which is Twenty's system field.
 * `companyName` keeps what the visitor typed, since a freemail address never
 * matches a Company.
 */
import { defineObject } from '../lib/sdk';
import {
  dateTime,
  files,
  manyToOne,
  multiSelect,
  number,
  richText,
  select,
  text,
  uniqueText,
} from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import { FAIR_LEAD_SOURCE, FOLLOW_UP_STATUS, PRODUCT_CATEGORY } from '../options';

const F = IDS.fairLead.fields;

export default defineObject({
  universalIdentifier: IDS.fairLead.object,
  nameSingular: 'fairLead',
  namePlural: 'fairLeads',
  labelSingular: 'Fair Lead',
  labelPlural: 'Fair Leads',
  description: 'Visitor captured at a fair (business card / QR form), with its lead score',
  icon: 'IconTicket',
  labelIdentifierFieldMetadataUniversalIdentifier: F.scanId,
  fields: [
    uniqueText({
      universalIdentifier: F.scanId,
      name: 'scanId',
      label: 'Scan ID · 扫码编号',
      icon: 'IconQrcode',
      description: 'QR-code or short-URL token; intake idempotency key',
    }),
    manyToOne({
      universalIdentifier: F.person,
      name: 'person',
      label: 'Person · 联系人',
      icon: 'IconUser',
      targetObjectId: STANDARD.person.object,
      inverseFieldId: IDS.person.fields.fairLeads,
    }),
    manyToOne({
      universalIdentifier: F.company,
      name: 'company',
      label: 'Company · 公司',
      icon: 'IconBuildingSkyscraper',
      targetObjectId: STANDARD.company.object,
      inverseFieldId: IDS.company.fields.fairLeads,
      description: 'Matched by e-mail domain (never by a freemail domain)',
    }),
    text({
      universalIdentifier: F.companyName,
      name: 'companyName',
      label: 'Company name (as given) · 公司名称',
      icon: 'IconBuilding',
    }),
    select({
      universalIdentifier: F.source,
      name: 'source',
      label: 'Source · 来源',
      icon: 'IconMapPin',
      options: FAIR_LEAD_SOURCE,
      defaultValue: 'CANTON_FAIR_2026',
    }),
    multiSelect({
      universalIdentifier: F.productInterest,
      name: 'productInterest',
      label: 'Product interest · 感兴趣的产品',
      icon: 'IconPackages',
      options: PRODUCT_CATEGORY,
    }),
    richText({
      universalIdentifier: F.notes,
      name: 'notes',
      label: 'Notes · 备注',
      icon: 'IconNotes',
    }),
    files({
      universalIdentifier: F.businessCardImage,
      name: 'businessCardImage',
      label: 'Business card · 名片',
      icon: 'IconId',
      maxNumberOfValues: 2,
      description: 'Front and back',
    }),
    select({
      universalIdentifier: F.followUpStatus,
      name: 'followUpStatus',
      label: 'Follow-up · 跟进状态',
      icon: 'IconProgressCheck',
      options: FOLLOW_UP_STATUS,
      defaultValue: 'NEW',
    }),
    dateTime({
      universalIdentifier: F.capturedAt,
      name: 'capturedAt',
      label: 'Captured at · 采集时间',
      icon: 'IconCalendarTime',
    }),
    number({
      universalIdentifier: F.score,
      name: 'score',
      label: 'Score · 评分',
      icon: 'IconGauge',
      description: '0–100, from score-fair-lead (A1 stub: deterministic rules)',
    }),
    richText({
      universalIdentifier: F.scoreBreakdown,
      name: 'scoreBreakdown',
      label: 'Score breakdown · 评分明细',
      icon: 'IconListDetails',
    }),
    dateTime({
      universalIdentifier: F.scoredAt,
      name: 'scoredAt',
      label: 'Scored at · 评分时间',
      icon: 'IconClock',
    }),
  ],
});
