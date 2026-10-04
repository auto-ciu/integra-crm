/**
 * "Price Items" — every price item across strategies. The seed numbers
 * sortOrder strategy-major (shared/pricing.mjs), so items group by strategy.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const P = IDS.priceItem.fields;
const V = IDS.views.priceItemsTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Price Items · 价格项',
  objectUniversalIdentifier: IDS.priceItem.object,
  type: ViewType.TABLE,
  icon: 'IconCurrencyEuro',
  position: 0,
  fields: columns(V.fields, [
    [P.name, 240],
    [P.productLine, 130],
    [P.tier, 120],
    [P.annualFeeEur, 150],
    [P.isOnRequest, 120],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: P.sortOrder,
      direction: ViewSortDirection.ASC,
    },
  ],
});
