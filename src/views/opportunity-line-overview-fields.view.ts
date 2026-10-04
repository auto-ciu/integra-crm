/** Fields widget for the Opportunity Line record page's Overview tab. */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const L = IDS.opportunityLine.fields;
const V = IDS.views.opportunityLineOverviewFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Overview · 概览',
  objectUniversalIdentifier: IDS.opportunityLine.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconListDetails',
  position: 0,
  fields: columns(V.fields, [
    [L.name, 0],
    [L.opportunity, 0],
    [L.stream, 0],
    [L.stage, 0],
    [L.offering, 0],
    [L.estimatedValueEur, 0],
    [L.probability, 0],
    [L.expectedCloseDate, 0],
    [L.notes, 0],
    [L.isActive, 0],
  ]),
});
