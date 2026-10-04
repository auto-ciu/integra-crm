/**
 * "Opportunity Lines" — table widget on the Product Stream record page's
 * Pipeline tab. Scoped to the current stream by the record-page host.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const L = IDS.opportunityLine.fields;
const V = IDS.views.streamOpportunityLinesWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Opportunity Lines · 商机明细',
  objectUniversalIdentifier: IDS.opportunityLine.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconListDetails',
  position: 0,
  fields: columns(V.fields, [
    [L.opportunity, 220],
    [L.stage, 150],
    [L.estimatedValueEur, 130],
    [L.probability, 100],
    [L.expectedCloseDate, 140],
  ]),
});
