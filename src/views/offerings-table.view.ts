/**
 * "Pricing" — every offering in sortOrder (the sidebar's Pricing item opens
 * this view).
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const O = IDS.offering.fields;
const V = IDS.views.offeringsTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Offerings · 产品定价',
  objectUniversalIdentifier: IDS.offering.object,
  type: ViewType.TABLE,
  icon: 'IconReceipt2',
  position: 0,
  fields: columns(V.fields, [
    [O.name, 280],
    [O.offeringCode, 190],
    [O.strategyType, 140],
    [O.displayFormat, 170],
    [O.isActive, 100],
    [O.validFrom, 140],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: O.sortOrder,
      direction: ViewSortDirection.ASC,
    },
  ],
});
