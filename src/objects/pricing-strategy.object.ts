/**
 * Pricing Strategy (C1) — HOW a product is sold (tiered, bundle, flat, …), not
 * the prices themselves: those are its Price Items. `displayMode` controls the
 * public website display (D3 defaults per type in shared/pricing.mjs), and
 * ops/publish-pricing.mjs publishes live strategies to pricing.json.
 *
 * The kind is `strategyType`, not `type`: Twenty reserves `type` as a field
 * name. `correlationId` is the stable public / Stripe key (e.g. ar-2026).
 * `itemCount` is denormalised for the strategies table — a view cannot
 * aggregate across a relation; ops/seed-pricing.mjs recomputes it.
 */
import { defineObject } from '../lib/sdk';
import { boolean, date, number, oneToMany, richText, select, text, uniqueText } from '../lib/fields';
import { IDS } from '../ids';
import { PRICING_DISPLAY_MODE, PRICING_STRATEGY_TYPE } from '../options';

const F = IDS.pricingStrategy.fields;

export default defineObject({
  universalIdentifier: IDS.pricingStrategy.object,
  nameSingular: 'pricingStrategy',
  namePlural: 'pricingStrategies',
  labelSingular: 'Pricing Strategy',
  labelPlural: 'Pricing Strategies',
  description: 'How Integra sells a product line; holds the price items published to the website',
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
      universalIdentifier: F.correlationId,
      name: 'correlationId',
      label: 'Correlation ID',
      icon: 'IconKey',
      description: 'Stable key, e.g. ar-2026: the public id in pricing.json (shared/pricing.mjs)',
    }),
    select({
      universalIdentifier: F.strategyType,
      name: 'strategyType',
      label: 'Strategy type · 定价方式',
      icon: 'IconCategory',
      options: PRICING_STRATEGY_TYPE,
      defaultValue: 'TIERED',
    }),
    richText({
      universalIdentifier: F.description,
      name: 'description',
      label: 'Description · 描述',
      icon: 'IconFileText',
    }),
    boolean({
      universalIdentifier: F.isActive,
      name: 'isActive',
      label: 'Active · 启用',
      icon: 'IconToggleRight',
      defaultValue: true,
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
    select({
      universalIdentifier: F.displayMode,
      name: 'displayMode',
      label: 'Public display · 公开展示',
      icon: 'IconEye',
      options: PRICING_DISPLAY_MODE,
      defaultValue: 'SHOW_PER_OPTION',
    }),
    number({
      universalIdentifier: F.sortOrder,
      name: 'sortOrder',
      label: 'Sort order · 排序',
      icon: 'IconSortAscendingNumbers',
    }),
    number({
      universalIdentifier: F.itemCount,
      name: 'itemCount',
      label: 'Items · 价格项',
      icon: 'IconList',
      description: 'Denormalised count of price items (recomputed by npm run pricing:seed)',
    }),
    oneToMany({
      universalIdentifier: F.items,
      name: 'items',
      label: 'Price items · 价格项',
      icon: 'IconCurrencyEuro',
      targetObjectId: IDS.priceItem.object,
      inverseFieldId: IDS.priceItem.fields.strategy,
    }),
  ],
});
