/**
 * Discovered Company — one LinkedIn company page found by a Lead Discovery
 * Run (A2), before anyone has decided it is a lead. Created by
 * src/functions/apify-webhook.ts (company pages with a website only), scored
 * by score-discovered-company.ts and turned into a CRM Company by
 * promote-discovered-company.ts.
 *
 * `isDuplicate` flags a LinkedIn page already found by an earlier run or
 * already on a CRM Company. `exportedCompanyId` is plain text (the Company's
 * UUID), not a relation, as the plan specifies.
 */
import { defineObject } from '../lib/sdk';
import { boolean, dateTime, link, manyToOne, multiSelect, number, richText, select, text, uniqueText } from '../lib/fields';
import { IDS } from '../ids';
import { EMPLOYEE_BAND, LEAD_EXPORT_REVENUE_BAND, ICP_TIER, LEAD_REVIEW_STATUS, PRODUCT_CATEGORY } from '../options';
import { STANDARD } from '../standard-ids';

const F = IDS.discoveredCompany.fields;

export default defineObject({
  universalIdentifier: IDS.discoveredCompany.object,
  nameSingular: 'discoveredCompany',
  namePlural: 'discoveredCompanies',
  labelSingular: 'Discovered Company',
  labelPlural: 'Discovered Companies',
  description: 'A LinkedIn company page found by a lead discovery run, with its score',
  icon: 'IconBuildingFactory2',
  labelIdentifierFieldMetadataUniversalIdentifier: F.companyName,
  fields: [
    manyToOne({
      universalIdentifier: F.discoveryRun,
      name: 'discoveryRun',
      label: 'Discovery run · 发现批次',
      icon: 'IconRadar',
      targetObjectId: IDS.leadDiscoveryRun.object,
      inverseFieldId: IDS.leadDiscoveryRun.fields.discoveredCompanies,
    }),
    text({
      universalIdentifier: F.companyName,
      name: 'companyName',
      label: 'Company name · 公司名称',
      icon: 'IconBuilding',
    }),
    text({
      universalIdentifier: F.companyNameZh,
      name: 'companyNameZh',
      label: 'Chinese name · 中文名称',
      icon: 'IconLanguage',
    }),
    link({
      universalIdentifier: F.website,
      name: 'website',
      label: 'Website · 网站',
      icon: 'IconWorld',
    }),
    link({
      universalIdentifier: F.linkedinUrl,
      name: 'linkedinUrl',
      label: 'LinkedIn page',
      icon: 'IconBrandLinkedin',
      description: 'Normalised https://www.linkedin.com/company/<slug>; the de-duplication key',
    }),
    text({
      universalIdentifier: F.industry,
      name: 'industry',
      label: 'Industry · 行业',
      icon: 'IconBriefcase',
    }),
    text({
      universalIdentifier: F.companySize,
      name: 'companySize',
      label: 'Company size · 公司规模',
      icon: 'IconUsers',
      description: 'LinkedIn employee band, e.g. "51-200"',
    }),
    text({
      universalIdentifier: F.headquarters,
      name: 'headquarters',
      label: 'Headquarters · 总部',
      icon: 'IconMapPin',
    }),
    multiSelect({
      universalIdentifier: F.productCategories,
      name: 'productCategories',
      label: 'Product categories · 产品类别',
      icon: 'IconPackages',
      options: PRODUCT_CATEGORY,
    }),
    richText({
      universalIdentifier: F.description,
      name: 'description',
      label: 'Description · 简介',
      icon: 'IconFileDescription',
    }),
    text({
      universalIdentifier: F.emailDomains,
      name: 'emailDomains',
      label: 'E-mail domains · 邮箱域名',
      icon: 'IconAt',
      description: 'Comma-separated company e-mail domains (not filled by LinkedIn)',
    }),
    boolean({
      universalIdentifier: F.isExportedToCRM,
      name: 'isExportedToCRM',
      label: 'In CRM · 已导入',
      icon: 'IconCircleCheck',
    }),
    text({
      universalIdentifier: F.exportedCompanyId,
      name: 'exportedCompanyId',
      label: 'CRM Company ID',
      icon: 'IconId',
    }),
    boolean({
      universalIdentifier: F.isDuplicate,
      name: 'isDuplicate',
      label: 'Duplicate · 重复',
      icon: 'IconCopy',
      description: 'Same LinkedIn page found by an earlier run, or already on a CRM Company',
    }),
    number({
      universalIdentifier: F.score,
      name: 'score',
      label: 'Score · 评分',
      icon: 'IconGauge',
      description: '0–100, from score-discovered-company (deterministic rules)',
    }),
    richText({
      universalIdentifier: F.scoreBreakdown,
      name: 'scoreBreakdown',
      label: 'Score breakdown · 评分明细',
      icon: 'IconListDetails',
    }),
    // ---- A2 LeadCandidate fields (lead import, enrichment, review, GDPR)
    text({ universalIdentifier: F.contactName, name: 'contactName', label: 'Contact name · 联系人', icon: 'IconUser' }),
    text({ universalIdentifier: F.contactTitle, name: 'contactTitle', label: 'Contact title · 职位', icon: 'IconBriefcase2' }),
    text({ universalIdentifier: F.contactEmail, name: 'contactEmail', label: 'Contact e-mail · 联系邮箱', icon: 'IconMail' }),
    text({ universalIdentifier: F.province, name: 'province', label: 'Province · 省份', icon: 'IconMapPin', description: 'Chinese province' }),
    select({ universalIdentifier: F.employeeBand, name: 'employeeBand', label: 'Employees · 员工数', icon: 'IconUsers', options: EMPLOYEE_BAND }),
    select({ universalIdentifier: F.exportRevenueBand, name: 'exportRevenueBand', label: 'Export revenue · 出口收入', icon: 'IconCurrencyEuro', options: LEAD_EXPORT_REVENUE_BAND }),
    text({ universalIdentifier: F.euExportEvidence, name: 'euExportEvidence', label: 'EU export evidence · 欧盟出口证据', icon: 'IconShip', description: 'What shows they export to the EU' }),
    boolean({ universalIdentifier: F.hasEuAr, name: 'hasEuAr', label: 'Has EU AR · 已有欧代', icon: 'IconShieldCheck' }),
    manyToOne({
      universalIdentifier: F.recommendedStream,
      name: 'recommendedStream',
      label: 'Recommended stream · 推荐产品线',
      icon: 'IconStack2',
      targetObjectId: IDS.productStream.object,
      inverseFieldId: IDS.productStream.fields.discoveredCompanies,
    }),
    number({ universalIdentifier: F.icpScore, name: 'icpScore', label: 'ICP score · ICP评分', icon: 'IconTargetArrow', description: '0–100, the plan\'s richer scoring (score is the basic rule score)' }),
    select({ universalIdentifier: F.icpTier, name: 'icpTier', label: 'ICP tier · ICP层级', icon: 'IconFlame', options: ICP_TIER }),
    richText({ universalIdentifier: F.scoreRationale, name: 'scoreRationale', label: 'Score rationale · 评分理由', icon: 'IconNotes' }),
    text({ universalIdentifier: F.scoreCitations, name: 'scoreCitations', label: 'Score citations · 评分来源', icon: 'IconLink', description: 'External data sources used in scoring' }),
    text({ universalIdentifier: F.scoreModel, name: 'scoreModel', label: 'Score model · 评分模型', icon: 'IconCpu' }),
    text({ universalIdentifier: F.scoreRubricVersion, name: 'scoreRubricVersion', label: 'Rubric version · 评分标准版本', icon: 'IconTag' }),
    dateTime({ universalIdentifier: F.scoredAt, name: 'scoredAt', label: 'Scored at · 评分时间', icon: 'IconCalendarEvent' }),
    uniqueText({ universalIdentifier: F.dedupeKey, name: 'dedupeKey', label: 'Dedupe key · 去重键', icon: 'IconFingerprint', description: 'LinkedIn URL, or a hash of company name + headquarters' }),
    select({ universalIdentifier: F.reviewStatus, name: 'reviewStatus', label: 'Review status · 审核状态', icon: 'IconChecklist', options: LEAD_REVIEW_STATUS, defaultValue: 'NEW' }),
    text({ universalIdentifier: F.rejectReason, name: 'rejectReason', label: 'Reject reason · 拒绝原因', icon: 'IconThumbDown' }),
    manyToOne({
      universalIdentifier: F.reviewedBy,
      name: 'reviewedBy',
      label: 'Reviewed by · 审核人',
      icon: 'IconUserCheck',
      targetObjectId: STANDARD.workspaceMember.object,
      inverseFieldId: IDS.workspaceMember.fields.reviewedDiscoveredCompanies,
    }),
    manyToOne({
      universalIdentifier: F.importId,
      name: 'importId',
      label: 'Lead import · 导入批次',
      icon: 'IconFileImport',
      targetObjectId: IDS.leadImport.object,
      inverseFieldId: IDS.leadImport.fields.discoveredCompanies,
    }),
    boolean({ universalIdentifier: F.isGdprArt14Sent, name: 'isGdprArt14Sent', label: 'GDPR Art.14 sent · 已发GDPR通知', icon: 'IconShieldLock' }),
    dateTime({ universalIdentifier: F.gdprArt14SentAt, name: 'gdprArt14SentAt', label: 'GDPR Art.14 sent at · 通知时间', icon: 'IconCalendarEvent' }),
    boolean({ universalIdentifier: F.isPotentialCompetitor, name: 'isPotentialCompetitor', label: 'Potential competitor · 疑似竞争对手', icon: 'IconSwords', description: 'Set during enrichment when the company looks like a competitor, not a client' }),
  ],
});
