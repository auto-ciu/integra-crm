/**
 * "Price Points" — table widget on the Offering record page, in sortOrder.
 * As with the Product Stream tables, the record-page host is expected to scope
 * the relation-bound table to the current offering.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const P = IDS.pricePoint.fields;
const V = IDS.views.offeringPricePointsWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Price Points · 价格点',
  objectUniversalIdentifier: IDS.pricePoint.object,
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
    [P.isLegacy, 100],
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
