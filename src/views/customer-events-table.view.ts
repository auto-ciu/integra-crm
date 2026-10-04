/**
 * "Portal Events" — every customer event the portal or Stripe reported (C3),
 * newest first. The sidebar's Portal Events item opens this view.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const E = IDS.customerEvent.fields;
const V = IDS.views.customerEventsTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Portal Events · 门户事件',
  objectUniversalIdentifier: IDS.customerEvent.object,
  type: ViewType.TABLE,
  icon: 'IconActivity',
  position: 0,
  fields: columns(V.fields, [
    [E.eventType, 140],
    [E.customer, 240],
    [E.source, 120],
    [E.processedAt, 160],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: E.processedAt,
      direction: ViewSortDirection.DESC,
    },
  ],
});
