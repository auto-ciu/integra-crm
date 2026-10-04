/**
 * "Lines" — table widget on the Client Price Agreement record page. As with
 * the Offering record page tables, the record-page host is expected to scope
 * the relation-bound table to the current agreement.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const L = IDS.agreementLine.fields;
const V = IDS.views.clientPriceAgreementLinesWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Lines · 协议明细',
  objectUniversalIdentifier: IDS.agreementLine.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconListDetails',
  position: 0,
  fields: columns(V.fields, [
    [L.name, 220],
    [L.offering, 200],
    [L.pricePoint, 200],
    [L.agreedPriceEur, 150],
    [L.discountPercent, 110],
    [L.quantity, 100],
    [L.effectiveFrom, 130],
    [L.effectiveUntil, 130],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: L.effectiveFrom,
      direction: ViewSortDirection.ASC,
    },
  ],
});
