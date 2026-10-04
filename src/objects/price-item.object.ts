/**
 * Price Item (C1) — one sellable price within a Pricing Strategy, e.g.
 * "AR Mandate Beginner" at €250/yr. Amounts are EUR with two decimals;
 * `currencyCode` is the invoicing currency and converts nothing. It is not
 * `currency`: Twenty reserves that name (like `type`); pricing.json still
 * calls it `currency`.
 *
 * `correlationId` (e.g. ar-beginner-2026) is the stable lookup key for the
 * Stripe sync and pricing.json; never change it once published.
 * `isOnRequest` replaces the price with "On request" on the website, and the
 * publisher then omits the amounts altogether.
 */
import { defineObject } from '../lib/sdk';
import { boolean, manyToOne, number, select, text, uniqueText } from '../lib/fields';
import { IDS } from '../ids';
import { PRICE_CURRENCY, PRICE_PRODUCT_LINE, TIER } from '../options';

const F = IDS.priceItem.fields;

export default defineObject({
  universalIdentifier: IDS.priceItem.object,
  nameSingular: 'priceItem',
  namePlural: 'priceItems',
  labelSingular: 'Price Item',
  labelPlural: 'Price Items',
  description: 'One price within a pricing strategy (product line × tier)',
  icon: 'IconCurrencyEuro',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconCurrencyEuro',
    }),
    manyToOne({
      universalIdentifier: F.strategy,
      name: 'strategy',
      label: 'Strategy · 定价策略',
      icon: 'IconReceipt2',
      targetObjectId: IDS.pricingStrategy.object,
      inverseFieldId: IDS.pricingStrategy.fields.items,
    }),
    select({
      universalIdentifier: F.productLine,
      name: 'productLine',
      label: 'Product line · 产品线',
      icon: 'IconBriefcase',
      options: PRICE_PRODUCT_LINE,
    }),
    select({
      universalIdentifier: F.tier,
      name: 'tier',
      label: 'Tier · 等级',
      icon: 'IconStairsUp',
      options: TIER,
    }),
    text({
      universalIdentifier: F.description,
      name: 'description',
      label: 'Description · 描述',
      icon: 'IconFileText',
    }),
    number({
      universalIdentifier: F.annualFeeEur,
      name: 'annualFeeEur',
      label: 'Annual fee (EUR) · 年费',
      icon: 'IconCurrencyEuro',
      decimals: 2,
      description: 'Empty when on request',
    }),
    number({
      universalIdentifier: F.setupFeeEur,
      name: 'setupFeeEur',
      label: 'Setup fee (EUR) · 开通费',
      icon: 'IconCurrencyEuro',
      decimals: 2,
    }),
    select({
      universalIdentifier: F.currencyCode,
      name: 'currencyCode',
      label: 'Currency · 币种',
      icon: 'IconCoins',
      options: PRICE_CURRENCY,
      defaultValue: 'EUR',
    }),
    boolean({
      universalIdentifier: F.isHighlighted,
      name: 'isHighlighted',
      label: 'Highlighted · 推荐',
      icon: 'IconStar',
    }),
    boolean({
      universalIdentifier: F.isOnRequest,
      name: 'isOnRequest',
      label: 'On request · 按需报价',
      icon: 'IconMessageQuestion',
    }),
    number({
      universalIdentifier: F.sortOrder,
      name: 'sortOrder',
      label: 'Sort order · 排序',
      icon: 'IconSortAscendingNumbers',
    }),
    uniqueText({
      universalIdentifier: F.correlationId,
      name: 'correlationId',
      label: 'Correlation ID',
      icon: 'IconKey',
      description: 'Stable key for Stripe sync and pricing.json, e.g. ar-beginner-2026',
    }),
  ],
});
