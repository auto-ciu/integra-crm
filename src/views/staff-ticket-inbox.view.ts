/**
 * "Ticket inbox" — every enquiry still being worked (status not CLOSED / SPAM),
 * most urgent first: priority DESC, then the SLA deadline ASC. E3.
 *
 * Priority sorts by its option position, and LOW → URGENT is positions 0 → 3,
 * so DESC puts URGENT on top. slaTarget and lastActivityAt render as relative
 * time (set on the fields); an overdue target is the Overdue tickets view.
 */
import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const E = IDS.enquiry.fields;
const V = IDS.views.staffTicketInbox;

export default defineView({
  universalIdentifier: V.view,
  name: 'Ticket inbox · 工单收件箱',
  objectUniversalIdentifier: IDS.enquiry.object,
  type: ViewType.TABLE,
  icon: 'IconInbox',
  position: 1,
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
      fieldMetadataUniversalIdentifier: E.status,
      operand: ViewFilterOperand.IS_NOT,
      value: ['CLOSED', 'SPAM'],
    },
  ],
  sorts: [
    {
      universalIdentifier: V.sorts[0],
      fieldMetadataUniversalIdentifier: E.priority,
      direction: ViewSortDirection.DESC,
    },
    {
      universalIdentifier: V.sorts[1],
      fieldMetadataUniversalIdentifier: E.slaTarget,
      direction: ViewSortDirection.ASC,
    },
  ],
});
