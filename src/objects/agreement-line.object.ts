/**
 * Agreement Line (C2) — one agreed price in a Client Price Agreement: an
 * Offering, usually one of its Price Points, and the price agreed for it.
 *
 * `pricePoint` must be one of the line's offering's price points. A relation
 * cannot express that, so the picker is unfiltered in the schema;
 * validate-agreement-discounts reports a line whose price point belongs to
 * another offering, and the quote / preview scripts skip it.
 *
 * `agreedPriceEur` is per unit (a year, or a seat for PER_SEAT offerings);
 * the line is worth agreedPriceEur × quantity. When it is empty the price is
 * the standard price less `discountPercent`. `discountPercent` is otherwise
 * informational: validation recomputes the discount from the two prices.
 */
import { defineObject } from '../lib/sdk';
import { date, manyToOne, number, text } from '../lib/fields';
import { IDS } from '../ids';

const F = IDS.agreementLine.fields;

export default defineObject({
  universalIdentifier: IDS.agreementLine.object,
  nameSingular: 'agreementLine',
  namePlural: 'agreementLines',
  labelSingular: 'Agreement Line',
  labelPlural: 'Agreement Lines',
  description: 'One agreed price in a client price agreement',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconListDetails',
    }),
    manyToOne({
      universalIdentifier: F.agreement,
      name: 'agreement',
      label: 'Agreement · 价格协议',
      icon: 'IconFileDollar',
      targetObjectId: IDS.clientPriceAgreement.object,
      inverseFieldId: IDS.clientPriceAgreement.fields.lines,
    }),
    manyToOne({
      universalIdentifier: F.offering,
      name: 'offering',
      label: 'Offering · 产品方案',
      icon: 'IconReceipt2',
      targetObjectId: IDS.offering.object,
      inverseFieldId: IDS.offering.fields.agreementLines,
    }),
    manyToOne({
      universalIdentifier: F.pricePoint,
      name: 'pricePoint',
      label: 'Price point · 价格点',
      icon: 'IconCurrencyEuro',
      description: 'Must be one of the offering’s price points',
      targetObjectId: IDS.pricePoint.object,
      inverseFieldId: IDS.pricePoint.fields.agreementLines,
    }),
    number({
      universalIdentifier: F.agreedPriceEur,
      name: 'agreedPriceEur',
      label: 'Agreed price (EUR) · 协议价',
      icon: 'IconCurrencyEuro',
      decimals: 2,
      description: 'Per year, or per seat; empty = standard price less the discount',
    }),
    number({
      universalIdentifier: F.discountPercent,
      name: 'discountPercent',
      label: 'Discount % · 折扣',
      icon: 'IconPercentage',
      decimals: 2,
      description: '0–100, off the standard price; validation recomputes it from the agreed price',
    }),
    text({
      universalIdentifier: F.discountRationale,
      name: 'discountRationale',
      label: 'Discount rationale · 折扣理由',
      icon: 'IconMessage',
    }),
    number({
      universalIdentifier: F.quantity,
      name: 'quantity',
      label: 'Quantity · 数量',
      icon: 'IconHash',
      description: 'Seats or units for volume / seat agreements; empty = 1',
    }),
    date({
      universalIdentifier: F.effectiveFrom,
      name: 'effectiveFrom',
      label: 'Effective from · 生效日期',
      icon: 'IconCalendarEvent',
    }),
    date({
      universalIdentifier: F.effectiveUntil,
      name: 'effectiveUntil',
      label: 'Effective until · 截止日期',
      icon: 'IconCalendarOff',
      description: 'Empty = open-ended',
    }),
  ],
});
