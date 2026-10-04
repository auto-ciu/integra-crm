/**
 * Enquiry — one inbound request (E1 ticketing). Created by enquiry intake from
 * the website contact form; worked by staff through the Enquiries inbox and
 * promoted to Company + Person + Opportunity when it turns into a lead.
 *
 * `reference` (ENQ-YYMMDD-XXXX) is what the requester sees in the
 * acknowledgement, so it is the label identifier. `intakeId` is the form's
 * client-generated UUID: intake looks it up first so a retried POST never
 * creates a second ticket.
 *
 * E3 adds the Zendesk-style fields: assignee, tags, SLA clock, activity
 * timestamps, resolution, satisfaction and staff-only notes. Status keeps its
 * E1 values; the E3 plan's ASSIGNED / WAITING map to OPEN / PENDING.
 */
import { defineObject } from '../lib/sdk';
import { dateTime, link, manyToOne, oneToMany, richText, select, text, uniqueText } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import {
  ENQUIRY_CATEGORY,
  ENQUIRY_LANGUAGE,
  ENQUIRY_PRIORITY,
  ENQUIRY_SOURCE,
  ENQUIRY_STATUS,
  SPAM_CHECK,
  TICKET_SATISFACTION,
} from '../options';

const F = IDS.enquiry.fields;

export default defineObject({
  universalIdentifier: IDS.enquiry.object,
  nameSingular: 'enquiry',
  namePlural: 'enquiries',
  labelSingular: 'Enquiry',
  labelPlural: 'Enquiries',
  description: 'Inbound enquiry ticket (contact form, email, phone, fair)',
  icon: 'IconInbox',
  labelIdentifierFieldMetadataUniversalIdentifier: F.reference,
  fields: [
    uniqueText({
      universalIdentifier: F.reference,
      name: 'reference',
      label: 'Reference · 编号',
      icon: 'IconHash',
      description: 'ENQ-YYMMDD-XXXX, quoted to the requester',
    }),
    uniqueText({
      universalIdentifier: F.intakeId,
      name: 'intakeId',
      label: 'Intake ID',
      icon: 'IconKey',
      description: 'Client-generated form submission id — intake idempotency key',
    }),
    select({
      universalIdentifier: F.status,
      name: 'status',
      label: 'Status · 状态',
      icon: 'IconProgressCheck',
      options: ENQUIRY_STATUS,
      defaultValue: 'NEW',
    }),
    select({
      universalIdentifier: F.priority,
      name: 'priority',
      label: 'Priority · 优先级',
      icon: 'IconFlag',
      options: ENQUIRY_PRIORITY,
      defaultValue: 'NORMAL',
    }),
    select({
      universalIdentifier: F.category,
      name: 'category',
      label: 'Category · 类别',
      icon: 'IconCategory',
      options: ENQUIRY_CATEGORY,
    }),
    text({
      universalIdentifier: F.subject,
      name: 'subject',
      label: 'Subject · 主题',
      icon: 'IconMail',
    }),
    select({
      universalIdentifier: F.language,
      name: 'language',
      label: 'Language · 语言',
      icon: 'IconLanguage',
      options: ENQUIRY_LANGUAGE,
      defaultValue: 'EN',
    }),
    select({
      universalIdentifier: F.source,
      name: 'source',
      label: 'Source · 来源',
      icon: 'IconInbox',
      options: ENQUIRY_SOURCE,
      defaultValue: 'WEB_FORM',
    }),
    text({
      universalIdentifier: F.sourcePage,
      name: 'sourcePage',
      label: 'Source page · 来源页面',
      icon: 'IconWorldWww',
    }),
    text({
      universalIdentifier: F.utmSource,
      name: 'utmSource',
      label: 'UTM source',
      icon: 'IconChartArrows',
    }),
    text({
      universalIdentifier: F.utmMedium,
      name: 'utmMedium',
      label: 'UTM medium',
      icon: 'IconChartArrows',
    }),
    text({
      universalIdentifier: F.utmCampaign,
      name: 'utmCampaign',
      label: 'UTM campaign',
      icon: 'IconChartArrows',
    }),
    select({
      universalIdentifier: F.spamCheck,
      name: 'spamCheck',
      label: 'Spam check · 垃圾检测',
      icon: 'IconShieldCheck',
      options: SPAM_CHECK,
    }),
    richText({
      universalIdentifier: F.triageNotes,
      name: 'triageNotes',
      label: 'Triage notes · 分诊备注',
      icon: 'IconNotes',
      description: 'AI triage summary and staff notes',
    }),
    dateTime({
      universalIdentifier: F.closedAt,
      name: 'closedAt',
      label: 'Closed at · 关闭时间',
      icon: 'IconCalendarCheck',
    }),
    manyToOne({
      universalIdentifier: F.relatedCompany,
      name: 'relatedCompany',
      label: 'Company · 公司',
      icon: 'IconBuildingSkyscraper',
      targetObjectId: STANDARD.company.object,
      inverseFieldId: IDS.company.fields.enquiries,
    }),
    manyToOne({
      universalIdentifier: F.relatedPerson,
      name: 'relatedPerson',
      label: 'Person · 联系人',
      icon: 'IconUser',
      targetObjectId: STANDARD.person.object,
      inverseFieldId: IDS.person.fields.enquiries,
    }),
    manyToOne({
      universalIdentifier: F.relatedOpportunity,
      name: 'relatedOpportunity',
      label: 'Opportunity · 商机',
      icon: 'IconTargetArrow',
      targetObjectId: STANDARD.opportunity.object,
      inverseFieldId: IDS.opportunity.fields.enquiries,
      description: 'Set by Promote to lead',
    }),
    manyToOne({
      universalIdentifier: F.assignedTo,
      name: 'assignedTo',
      label: 'Assigned to · 负责人',
      icon: 'IconUserCircle',
      targetObjectId: STANDARD.workspaceMember.object,
      inverseFieldId: IDS.workspaceMember.fields.assignedEnquiries,
    }),
    text({
      universalIdentifier: F.tags,
      name: 'tags',
      label: 'Tags · 标签',
      icon: 'IconTags',
      description: 'Comma-separated, e.g. "dpp,urgent,canton-fair"',
    }),
    dateTime({
      universalIdentifier: F.slaTarget,
      name: 'slaTarget',
      relative: true,
      label: 'SLA target · 响应期限',
      icon: 'IconClockExclamation',
      description: 'When this must be responded to by (from the SLA policy for its priority)',
    }),
    dateTime({
      universalIdentifier: F.firstResponseAt,
      name: 'firstResponseAt',
      label: 'First response at · 首次回复',
      icon: 'IconClockCheck',
    }),
    dateTime({
      universalIdentifier: F.lastActivityAt,
      name: 'lastActivityAt',
      relative: true,
      label: 'Last activity · 最近活动',
      icon: 'IconActivity',
    }),
    text({
      universalIdentifier: F.resolution,
      name: 'resolution',
      label: 'Resolution · 处理结果',
      icon: 'IconCircleCheck',
      description: 'How it was resolved (summary)',
    }),
    select({
      universalIdentifier: F.satisfaction,
      name: 'satisfaction',
      label: 'Satisfaction · 满意度',
      icon: 'IconMoodSmile',
      options: TICKET_SATISFACTION,
      defaultValue: 'NONE',
      description: 'Post-resolution feedback',
    }),
    link({
      universalIdentifier: F.sourceUrl,
      name: 'sourceUrl',
      label: 'Source URL · 来源链接',
      icon: 'IconLink',
      description: 'Where the enquiry came from, e.g. the website page',
    }),
    richText({
      universalIdentifier: F.internalNotes,
      name: 'internalNotes',
      label: 'Internal notes · 内部备注',
      icon: 'IconLock',
      description: 'Staff-only notes',
    }),
    oneToMany({
      universalIdentifier: F.messages,
      name: 'messages',
      label: 'Messages · 消息',
      icon: 'IconMessages',
      targetObjectId: IDS.enquiryMessage.object,
      inverseFieldId: IDS.enquiryMessage.fields.enquiry,
    }),
  ],
});
