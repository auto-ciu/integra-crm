/**
 * "Overdue tickets" — slaTarget already in the past and the enquiry not
 * CLOSED / SPAM, the worst breach first. E3.
 *
 * "Red-highlighted": a view manifest cannot colour rows, so the red is the
 * flame icon and the sidebar entry; the SLA column shows how late each one is
 * (relative time).
 */
import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const E = IDS.enquiry.fields;
const V = IDS.views.overdueTickets;

export default defineView({
  universalIdentifier: V.view,
  name: 'Overdue tickets · 逾期工单',
  objectUniversalIdentifier: IDS.enquiry.object,
  type: ViewType.TABLE,
  icon: 'IconFlameFilled',
  position: 3,
  fields: columns(V.fields, [
    [E.status, 110],
    [E.priority, 110],
    [E.subject, 260],
    [E.assignedTo, 150],
    [E.slaTarget, 140],
    [E.lastActivityAt, 140],
    [E.source, 110],
    [E.tags, 160],
  ]),
  filters: [
    {
      universalIdentifier: V.filters[0],
      fieldMetadataUniversalIdentifier: E.slaTarget,
      operand: ViewFilterOperand.IS_IN_PAST,
      value: '',
    },
    {
      universalIdentifier: V.filters[1],
      fieldMetadataUniversalIdentifier: E.status,
      operand: ViewFilterOperand.IS_NOT,
      value: ['CLOSED', 'SPAM'],
    },
  ],
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: E.slaTarget,
      direction: ViewSortDirection.ASC,
    },
  ],
});
