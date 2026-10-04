/**
 * "Pricing" — every pricing strategy in sortOrder (the sidebar's Pricing
 * item opens this view). itemCount is denormalised, see pricing-strategy.object.ts.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const S = IDS.pricingStrategy.fields;
const V = IDS.views.pricingStrategiesTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Pricing Strategies · 定价策略',
  objectUniversalIdentifier: IDS.pricingStrategy.object,
  type: ViewType.TABLE,
  icon: 'IconReceipt2',
  position: 0,
  fields: columns(V.fields, [
    [S.name, 280],
    [S.strategyType, 140],
    [S.isActive, 100],
    [S.validFrom, 140],
    [S.itemCount, 100],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: S.sortOrder,
      direction: ViewSortDirection.ASC,
    },
  ],
});
