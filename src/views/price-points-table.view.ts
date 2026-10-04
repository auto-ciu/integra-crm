/**
 * "Price Points" — every price point across offerings. The seed numbers
 * sortOrder offering-major (shared/public-pricing.mjs), so they group by offering.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const P = IDS.pricePoint.fields;
const V = IDS.views.pricePointsTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Price Points · 价格点',
  objectUniversalIdentifier: IDS.pricePoint.object,
  type: ViewType.TABLE,
  icon: 'IconCurrencyEuro',
  position: 0,
  fields: columns(V.fields, [
    [P.name, 240],
    [P.offering, 200],
    [P.tier, 120],
    [P.annualFeeEur, 150],
    [P.isOnRequest, 120],
    [P.isLegacy, 100],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: P.sortOrder,
      direction: ViewSortDirection.ASC,
    },
  ],
});
