/**
 * "Market Research" — every AI research brief (D1-D2), by topic. The
 * sidebar's Market Research item opens this view.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const R = IDS.researchBrief.fields;
const V = IDS.views.researchBriefsTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Market Research · 市场研究',
  objectUniversalIdentifier: IDS.researchBrief.object,
  type: ViewType.TABLE,
  icon: 'IconTelescope',
  position: 0,
  fields: columns(V.fields, [
    [R.title, 280],
    [R.topic, 180],
    [R.scope, 100],
    [R.depth, 140],
    [R.status, 130],
    [R.costUsd, 110],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: R.topic,
      direction: ViewSortDirection.ASC,
    },
  ],
});
