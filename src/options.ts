/**
 * Shared select option sets. Anything used by more than one object lives here
 * so Company.productCategory and MandateProduct.category cannot drift.
 *
 * Colours are Twenty's option-pill palette names (gray, blue, purple, green,
 * yellow, red, orange, pink, sky, turquoise) — they map onto the workspace
 * theme, so the Integra ramps from crm/theme apply automatically.
 */
import { options } from './lib/fields';
import { OPPORTUNITY_STAGES } from '../shared/stages.mjs';

export const PROVINCE = options([
  ['GUANGDONG', 'Guangdong · 广东', 'blue'],
  ['ZHEJIANG', 'Zhejiang · 浙江', 'sky'],
  ['JIANGSU', 'Jiangsu · 江苏', 'turquoise'],
  ['FUJIAN', 'Fujian · 福建', 'green'],
  ['SHANDONG', 'Shandong · 山东', 'purple'],
  ['OTHER', 'Other · 其他', 'gray'],
]);

/**
 * One value per product stream (shared/streams.mjs seeds a ProductStream for
 * each; verify-model.mjs keeps the two in step). Also FairLead.productInterest
 * and the A1 fair-lead score weights (shared/scoring.mjs).
 */
export const PRODUCT_CATEGORY = options([
  ['BATTERY_LI_ION', 'Battery — Li-ion · 锂离子电池', 'blue'],
  ['BATTERY_LMT', 'Battery — LMT · 轻型交通工具电池', 'sky'],
  ['TEXTILES', 'Textiles · 纺织品', 'purple'],
  ['ELECTRONICS', 'Electronics · 电子产品', 'turquoise'],
  ['FURNITURE', 'Furniture · 家具', 'brown'],
  ['TOYS', 'Toys · 玩具', 'pink'],
  ['MACHINERY', 'Machinery · 机械', 'orange'],
  ['MEDICAL_DEVICES', 'Medical Devices · 医疗器械', 'green'],
  ['OTHER', 'Other · 其他', 'gray'],
]);

export const EXPORT_REVENUE_BAND = options([
  ['LT_500K', '< 500k EUR', 'gray'],
  ['B_500K_1M', '500k–1M EUR', 'sky'],
  ['B_1M_5M', '1–5M EUR', 'blue'],
  ['B_5M_10M', '5–10M EUR', 'purple'],
  ['GT_10M', '> 10M EUR', 'green'],
]);

/** The four Integra service tiers — shared by Company and Opportunity. */
export const TIER = options([
  ['BEGINNER', 'Beginner', 'gray'],
  ['BOOST', 'Boost', 'sky'],
  ['BUILDER', 'Builder', 'blue'],
  ['BOSS', 'Boss', 'purple'],
]);

export const ROLE_TITLE = options([
  ['EXPORT_MANAGER', 'Export Manager · 外贸经理', 'blue'],
  ['COMPLIANCE_OFFICER', 'Compliance Officer · 合规专员', 'purple'],
  ['QUALITY_MANAGER', 'Quality Manager · 质量经理', 'turquoise'],
  ['GENERAL_MANAGER', 'General Manager · 总经理', 'green'],
  ['OTHER', 'Other · 其他', 'gray'],
]);

export const LANGUAGE = options([
  ['EN', 'EN', 'blue'],
  ['ZH', 'ZH · 中文', 'red'],
  ['EN_ZH', 'EN+ZH', 'purple'],
]);

export const PREFERRED_CHANNEL = options([
  ['WECHAT', 'WeChat · 微信', 'green'],
  ['EMAIL', 'Email · 邮件', 'blue'],
  ['PHONE', 'Phone · 电话', 'sky'],
  ['WECOM', 'WeCom · 企业微信', 'turquoise'],
]);

/** Fair-lead triage (Requirement 6 fills it; the kanban exists from day one). */
export const LEAD_STATUS = options([
  ['NEW', 'New · 新', 'blue'],
  ['QUALIFIED', 'Qualified · 已确认', 'green'],
  ['DISCARD', 'Discard · 放弃', 'gray'],
]);

export const PRODUCT_LINE = options([
  ['DPP', 'DPP', 'blue'],
  ['AR', 'AR', 'purple'],
  ['TRAINING', 'Training · 培训', 'green'],
  ['BUNDLE', 'Bundle · 组合', 'turquoise'],
]);

export const MANDATE_STATUS = options([
  ['DRAFT', 'Draft · 草稿', 'gray'],
  ['SENT', 'Sent · 已发送', 'sky'],
  ['SIGNED', 'Signed · 已签署', 'blue'],
  ['ACTIVE', 'Active · 生效', 'green'],
  ['EXPIRING', 'Expiring · 即将到期', 'yellow'],
  ['LAPSED', 'Lapsed · 已失效', 'red'],
]);

/** Computed nightly by ops/nightly-status.mjs — not hand-edited. */
export const URGENCY = options([
  ['NONE', 'None', 'gray'],
  ['WATCH', 'Watch · 关注', 'sky'],
  ['DUE', 'Due · 到期', 'yellow'],
  ['OVERDUE', 'Overdue · 逾期', 'red'],
]);

export const DPP_STATUS = options([
  ['NONE', 'None', 'gray'],
  ['DRAFT', 'Draft · 草稿', 'sky'],
  ['PUBLISHED', 'Published · 已发布', 'blue'],
  ['REGISTRY_SUBMITTED', 'Registry-submitted · 已提交注册', 'green'],
]);

export const TRAINING_CHANNEL = options([
  ['WEBINAR', 'Webinar · 网络研讨会', 'blue'],
  ['CANTON_FAIR', 'Canton Fair · 广交会', 'yellow'],
  ['ON_SITE', 'On-site · 现场', 'green'],
  ['OTHER', 'Other · 其他', 'gray'],
]);

export const AUTHORITY_TYPE = options([
  ['MARKET_SURVEILLANCE', 'Market Surveillance Authority', 'blue'],
  ['CIRPASS_2', 'CIRPASS-2 Working Group', 'purple'],
  ['NOTIFIED_BODY', 'Notified Body', 'green'],
  ['OTHER', 'Other', 'gray'],
]);

// ------------------------------------------------------------ E1 enquiries

export const ENQUIRY_STATUS = options([
  ['NEW', 'New · 新', 'blue'],
  ['OPEN', 'Open · 处理中', 'sky'],
  ['PENDING', 'Pending · 待回复', 'yellow'],
  ['CLOSED', 'Closed · 已关闭', 'green'],
  ['SPAM', 'Spam · 垃圾', 'gray'],
]);

export const ENQUIRY_PRIORITY = options([
  ['LOW', 'Low · 低', 'gray'],
  ['NORMAL', 'Normal · 普通', 'sky'],
  ['HIGH', 'High · 高', 'orange'],
  ['URGENT', 'Urgent · 紧急', 'red'],
]);

/**
 * Service interest on the contact form = stream codes. A SELECT until Feature
 * B1's ProductStream object exists; then this becomes a relation.
 */
export const ENQUIRY_CATEGORY = options([
  ['DPP', 'DPP', 'blue'],
  ['AR', 'EU Representative · 欧代', 'purple'],
  ['TRAINING', 'Training · 培训', 'green'],
  ['AUTHORITIES', 'For Authorities · 监管机构', 'turquoise'],
  ['OTHER', 'Other · 其他', 'gray'],
]);

/** Same values as Person.language (minus EN_ZH) so intake can copy it across. */
export const ENQUIRY_LANGUAGE = options([
  ['EN', 'EN', 'blue'],
  ['ZH', 'ZH · 中文', 'red'],
]);

export const ENQUIRY_SOURCE = options([
  ['WEB_FORM', 'Web form · 网站表单', 'blue'],
  ['EMAIL', 'Email · 邮件', 'sky'],
  ['PHONE', 'Phone · 电话', 'turquoise'],
  ['FAIR', 'Fair · 展会', 'yellow'],
  ['OTHER', 'Other · 其他', 'gray'],
]);

/** Turnstile result. UNVERIFIED = widget failed to load (e.g. from mainland China). */
export const SPAM_CHECK = options([
  ['VERIFIED', 'Verified · 已验证', 'green'],
  ['UNVERIFIED', 'Unverified · 未验证', 'yellow'],
  ['FAILED', 'Failed · 未通过', 'red'],
]);

export const MESSAGE_DIRECTION = options([
  ['INBOUND', 'Inbound · 来信', 'blue'],
  ['OUTBOUND', 'Outbound · 回复', 'green'],
  ['NOTE', 'Internal note · 内部备注', 'yellow'],
]);

// ------------------------------------------------------- B1 product streams

export const STREAM_UPDATE_TYPE = options([
  ['REGULATORY_UPDATE', 'Regulatory update · 法规更新', 'blue'],
  ['GUIDANCE', 'Guidance · 指南', 'turquoise'],
  ['DEADLINE', 'Deadline · 截止日期', 'red'],
  ['EVENT', 'Event · 活动', 'purple'],
  ['NEWS', 'News · 新闻', 'gray'],
]);

export const STREAM_DOCUMENT_TYPE = options([
  ['REGULATION', 'Regulation · 法规', 'blue'],
  ['GUIDANCE', 'Guidance · 指南', 'turquoise'],
  ['TEMPLATE', 'Template · 模板', 'purple'],
  ['CHECKLIST', 'Checklist · 清单', 'green'],
  ['REPORT', 'Report · 报告', 'gray'],
]);

export const STREAM_CONTACT_ROLE = options([
  ['LEAD', 'Lead · 负责人', 'blue'],
  ['EXPERT', 'Expert · 专家', 'purple'],
  ['SUPPORT', 'Support · 支持', 'gray'],
]);

// ----------------------------------------------------- B1 fair card capture

export const FAIR_LEAD_SOURCE = options([
  ['CANTON_FAIR_2026', 'Canton Fair 2026 · 2026广交会', 'yellow'],
  ['CANTON_FAIR_2027', 'Canton Fair 2027 · 2027广交会', 'orange'],
  ['OTHER_FAIR', 'Other fair · 其他展会', 'purple'],
  ['WALK_IN', 'Walk-in · 到访', 'green'],
  ['ONLINE', 'Online · 线上', 'blue'],
]);

export const FOLLOW_UP_STATUS = options([
  ['NEW', 'New · 新', 'blue'],
  ['CONTACTED', 'Contacted · 已联系', 'sky'],
  ['QUALIFIED', 'Qualified · 已确认', 'green'],
  ['DISQUALIFIED', 'Disqualified · 不合格', 'gray'],
]);

/** Re-exported so views can import stages from the same module as the rest. */
export { OPPORTUNITY_STAGES };
