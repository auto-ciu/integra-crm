/**
 * "Lead Discovery" — every Apify LinkedIn discovery run (A2), newest first.
 * The sidebar's Lead Discovery item opens this view.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const R = IDS.leadDiscoveryRun.fields;
const V = IDS.views.leadDiscoveryRunsTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Lead Discovery · 线索发现',
  objectUniversalIdentifier: IDS.leadDiscoveryRun.object,
  type: ViewType.TABLE,
  icon: 'IconRadar',
  position: 0,
  fields: columns(V.fields, [
    [R.name, 240],
    [R.status, 120],
    [R.query, 260],
    [R.resultsCount, 100],
    [R.resultsNew, 120],
    [R.costUsd, 110],
    [R.startedAt, 150],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: R.startedAt,
      direction: ViewSortDirection.DESC,
    },
  ],
});
