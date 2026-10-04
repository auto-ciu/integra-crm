/**
 * "Price Items" — table widget on the Pricing Strategy record page, in
 * sortOrder. As with the Product Stream tables, the record-page host is
 * expected to scope the relation-bound table to the current strategy.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const P = IDS.priceItem.fields;
const V = IDS.views.strategyPriceItemsWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Price Items · 价格项',
  objectUniversalIdentifier: IDS.priceItem.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconCurrencyEuro',
  position: 0,
  fields: columns(V.fields, [
    [P.name, 220],
    [P.tier, 110],
    [P.annualFeeEur, 140],
    [P.setupFeeEur, 130],
    [P.isOnRequest, 110],
    [P.isHighlighted, 110],
    [P.correlationId, 180],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: P.sortOrder,
      direction: ViewSortDirection.ASC,
    },
  ],
});
