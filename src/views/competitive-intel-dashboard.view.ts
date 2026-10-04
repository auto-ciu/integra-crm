/**
 * "Competitive Intel" — every Competitor with its stream, latest observation,
 * number of price observations and risk level (HIGH first). Observation count
 * and risk are denormalised by research-ingest (shared/competitive-intel.mjs).
 * A competitor belongs to one stream (competitorOf), so that is a column, not a count.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const C = IDS.competitor.fields;
const V = IDS.views.competitiveIntelDashboard;

export default defineView({
  universalIdentifier: V.view,
  name: 'Competitive Intel · 竞争情报',
  objectUniversalIdentifier: IDS.competitor.object,
  type: ViewType.TABLE,
  icon: 'IconSwords',
  position: 0,
  fields: columns(V.fields, [
    [C.name, 220],
    [C.competitorOf, 180],
    [C.lastObservationAt, 170],
    [C.priceObservationCount, 140],
    [C.riskLevel, 120],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: C.riskLevel,
      direction: ViewSortDirection.ASC,
    },
  ],
});
