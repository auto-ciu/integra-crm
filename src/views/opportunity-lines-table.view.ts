/** "Opportunity Lines" — every line, soonest expected close first. */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const L = IDS.opportunityLine.fields;
const V = IDS.views.opportunityLinesTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Opportunity Lines · 商机明细',
  objectUniversalIdentifier: IDS.opportunityLine.object,
  type: ViewType.TABLE,
  icon: 'IconListDetails',
  position: 0,
  fields: columns(V.fields, [
    [L.opportunity, 220],
    [L.stream, 180],
    [L.stage, 160],
    [L.offering, 180],
    [L.estimatedValueEur, 140],
    [L.probability, 110],
    [L.expectedCloseDate, 150],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: L.expectedCloseDate,
      direction: ViewSortDirection.ASC,
    },
  ],
});
