/**
 * Price Point (C1) — one sellable price within an Offering, e.g. "AR Mandate
 * Beginner" at €250/yr. Amounts are EUR with two decimals; `currencyCode` is
 * the invoicing currency and converts nothing. It is not `currency`: Twenty
 * reserves that name (like `type`); pricing.json still calls it `currency`.
 *
 * `correlationId` (e.g. dpp-beginner-2026) is the stable lookup key for the
 * Stripe sync and pricing.json; never change it once published.
 * `isOnRequest` replaces the price with "On request" on the website, and the
 * publisher then omits the amounts altogether. `isLegacy` price points stay
 * for existing customers but are never published.
 */
import { defineObject } from '../lib/sdk';
import { boolean, manyToOne, number, oneToMany, select, text, uniqueText } from '../lib/fields';
import { IDS } from '../ids';
import { PRICE_CURRENCY, TIER } from '../options';

const F = IDS.pricePoint.fields;

export default defineObject({
  universalIdentifier: IDS.pricePoint.object,
  nameSingular: 'pricePoint',
  namePlural: 'pricePoints',
  labelSingular: 'Price Point',
  labelPlural: 'Price Points',
  description: 'One price within an offering (a tier, a seat price, a flat fee)',
  icon: 'IconCurrencyEuro',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconCurrencyEuro',
    }),
    uniqueText({
      universalIdentifier: F.correlationId,
      name: 'correlationId',
      label: 'Correlation ID',
      icon: 'IconKey',
      description: 'Stable key for Stripe sync and pricing.json, e.g. dpp-beginner-2026',
    }),
    manyToOne({
      universalIdentifier: F.offering,
      name: 'offering',
      label: 'Offering · 产品',
      icon: 'IconReceipt2',
      targetObjectId: IDS.offering.object,
      inverseFieldId: IDS.offering.fields.pricePoints,
    }),
    select({
      universalIdentifier: F.tier,
      name: 'tier',
      label: 'Tier · 等级',
      icon: 'IconStairsUp',
      options: TIER,
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
    boolean({
      universalIdentifier: F.isLegacy,
      name: 'isLegacy',
      label: 'Legacy · 旧价格',
      icon: 'IconHistory',
      description: 'Kept for existing customers; never published',
    }),
    number({
      universalIdentifier: F.sortOrder,
      name: 'sortOrder',
      label: 'Sort order · 排序',
      icon: 'IconSortAscendingNumbers',
    }),
    text({
      universalIdentifier: F.description,
      name: 'description',
      label: 'Description · 描述',
      icon: 'IconFileText',
    }),
    oneToMany({
      universalIdentifier: F.agreementLines,
      name: 'agreementLines',
      label: 'Agreement lines · 协议明细',
      icon: 'IconFileDollar',
      description: 'Client price agreement lines at this price point',
      targetObjectId: IDS.agreementLine.object,
      inverseFieldId: IDS.agreementLine.fields.pricePoint,
    }),
  ],
});
