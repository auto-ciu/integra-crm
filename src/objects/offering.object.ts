/**
 * Offering (C1) — HOW a product is sold (flat, tiered, bundle, …), not the
 * prices themselves: those are its Price Points. `displayFormat` controls the
 * public website layout (D3 defaults per type in shared/public-pricing.mjs),
 * and ops/publish-pricing.mjs publishes live offerings to pricing.json.
 *
 * The kind is `strategyType`, not `type`: Twenty reserves `type` as a field
 * name. `offeringCode` (e.g. AR, DPP_SUBSCRIPTION) is the stable public /
 * Stripe key.
 */
import { defineObject } from '../lib/sdk';
import { boolean, date, number, oneToMany, richText, select, text, uniqueText } from '../lib/fields';
import { IDS } from '../ids';
import { PRICING_DISPLAY_FORMAT, PRICING_STRATEGY_TYPE, PRODUCT_CATEGORY } from '../options';

const F = IDS.offering.fields;

export default defineObject({
  universalIdentifier: IDS.offering.object,
  nameSingular: 'offering',
  namePlural: 'offerings',
  labelSingular: 'Offering',
  labelPlural: 'Offerings',
  description: 'How Integra sells a product; holds the price points published to the website',
  icon: 'IconReceipt2',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconReceipt2',
    }),
    uniqueText({
      universalIdentifier: F.offeringCode,
      name: 'offeringCode',
      label: 'Offering code',
      icon: 'IconKey',
      description: 'Stable key, e.g. AR or DPP_SUBSCRIPTION: the public id in pricing.json and the Stripe product id',
    }),
    select({
      universalIdentifier: F.productCategory,
      name: 'productCategory',
      label: 'Product category · 产品类别',
      icon: 'IconBriefcase',
      options: PRODUCT_CATEGORY,
    }),
    select({
      universalIdentifier: F.strategyType,
      name: 'strategyType',
      label: 'Strategy type · 定价方式',
      icon: 'IconCategory',
      options: PRICING_STRATEGY_TYPE,
      defaultValue: 'TIERED',
    }),
    select({
      universalIdentifier: F.displayFormat,
      name: 'displayFormat',
      label: 'Display format · 展示形式',
      icon: 'IconEye',
      options: PRICING_DISPLAY_FORMAT,
      defaultValue: 'TIER_TABLE',
    }),
    boolean({
      universalIdentifier: F.fromPrefix,
      name: 'fromPrefix',
      label: 'From prefix · 起价',
      icon: 'IconArrowBarToRight',
      description: 'Show "from €…" (D3): true when the strategy type is ADD_ON or hasOptionalExtras',
    }),
    boolean({
      universalIdentifier: F.hasOptionalExtras,
      name: 'hasOptionalExtras',
      label: 'Optional extras · 可选附加',
      icon: 'IconPlus',
      description: 'The price excludes optional extras; implies fromPrefix (D3)',
    }),
    boolean({
      universalIdentifier: F.isActive,
      name: 'isActive',
      label: 'Active · 启用',
      icon: 'IconToggleRight',
      defaultValue: true,
    }),
    richText({
      universalIdentifier: F.description,
      name: 'description',
      label: 'Description · 描述',
      icon: 'IconFileText',
    }),
    richText({
      universalIdentifier: F.features,
      name: 'features',
      label: 'Features · 功能',
      icon: 'IconListCheck',
      description: 'One feature per line; published as a list of strings',
    }),
    date({
      universalIdentifier: F.validFrom,
      name: 'validFrom',
      label: 'Valid from · 生效日期',
      icon: 'IconCalendarEvent',
    }),
    date({
      universalIdentifier: F.validUntil,
      name: 'validUntil',
      label: 'Valid until · 截止日期',
      icon: 'IconCalendarOff',
      description: 'Empty = open-ended',
    }),
    number({
      universalIdentifier: F.sortOrder,
      name: 'sortOrder',
      label: 'Sort order · 排序',
      icon: 'IconSortAscendingNumbers',
    }),
    oneToMany({
      universalIdentifier: F.pricePoints,
      name: 'pricePoints',
      label: 'Price points · 价格点',
      icon: 'IconCurrencyEuro',
      targetObjectId: IDS.pricePoint.object,
      inverseFieldId: IDS.pricePoint.fields.offering,
    }),
    oneToMany({
      universalIdentifier: F.bundleItems,
      name: 'bundleItems',
      label: 'Bundle items · 组合内容',
      icon: 'IconPackages',
      description: 'For a BUNDLE offering: its components',
      targetObjectId: IDS.bundleItem.object,
      inverseFieldId: IDS.bundleItem.fields.bundle,
    }),
    oneToMany({
      universalIdentifier: F.componentOf,
      name: 'componentOf',
      label: 'Component of · 所属组合',
      icon: 'IconPackages',
      description: 'Bundles that include this offering',
      targetObjectId: IDS.bundleItem.object,
      inverseFieldId: IDS.bundleItem.fields.component,
    }),
    oneToMany({
      universalIdentifier: F.competitorObservations,
      name: 'competitorObservations',
      label: 'Competitor prices · 竞品价格',
      icon: 'IconScale',
      targetObjectId: IDS.competitorPriceObservation.object,
      inverseFieldId: IDS.competitorPriceObservation.fields.offering,
    }),
    oneToMany({
      universalIdentifier: F.opportunityLines,
      name: 'opportunityLines',
      label: 'Opportunity lines · 商机明细',
      icon: 'IconListDetails',
      description: 'Opportunity lines quoting this offering',
      targetObjectId: IDS.opportunityLine.object,
      inverseFieldId: IDS.opportunityLine.fields.offering,
    }),
    oneToMany({
      universalIdentifier: F.agreementLines,
      name: 'agreementLines',
      label: 'Agreement lines · 协议明细',
      icon: 'IconFileDollar',
      description: 'Client price agreement lines for this offering',
      targetObjectId: IDS.agreementLine.object,
      inverseFieldId: IDS.agreementLine.fields.offering,
    }),
    oneToMany({
      universalIdentifier: F.discountRules,
      name: 'discountRules',
      label: 'Discount rules · 折扣规则',
      icon: 'IconDiscount2',
      description: 'Discount rules specific to this offering',
      targetObjectId: IDS.discountRule.object,
      inverseFieldId: IDS.discountRule.fields.offering,
    }),
  ],
});
