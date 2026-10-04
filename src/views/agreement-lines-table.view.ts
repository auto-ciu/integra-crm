/** "Agreement Lines" — every agreed price across all client price agreements. */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const L = IDS.agreementLine.fields;
const V = IDS.views.agreementLinesTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Agreement Lines · 协议明细',
  objectUniversalIdentifier: IDS.agreementLine.object,
  type: ViewType.TABLE,
  icon: 'IconListDetails',
  position: 0,
  fields: columns(V.fields, [
    [L.name, 220],
    [L.agreement, 200],
    [L.offering, 200],
    [L.pricePoint, 200],
    [L.agreedPriceEur, 150],
    [L.discountPercent, 110],
    [L.quantity, 100],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: L.effectiveFrom,
      direction: ViewSortDirection.DESC,
    },
  ],
});
