/**
 * "Competitors" — table widget on the Product Stream record page's
 * Competitive Intel tab. Scoped to the current stream by the record-page host.
 */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const C = IDS.competitor.fields;
const V = IDS.views.streamCompetitorsWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Competitors · 竞争对手',
  objectUniversalIdentifier: IDS.competitor.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconSwords',
  position: 0,
  fields: columns(V.fields, [
    [C.name, 220],
    [C.lastObservationAt, 170],
    [C.priceObservationCount, 140],
    [C.riskLevel, 120],
  ]),
});
