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

export const PRODUCT_CATEGORY = options([
  ['BATTERY_LI_ION', 'Battery — Li-ion · 锂离子电池', 'blue'],
  ['BATTERY_LMT', 'Battery — LMT · 轻型交通工具电池', 'sky'],
  ['TEXTILES', 'Textiles · 纺织品', 'purple'],
  ['ELECTRONICS', 'Electronics · 电子产品', 'turquoise'],
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

/** Re-exported so views can import stages from the same module as the rest. */
export { OPPORTUNITY_STAGES };
