/**
 * "My tickets" — the Ticket inbox narrowed to enquiries assigned to the
 * signed-in user. E3.
 *
 * The assignee filter uses Twenty's "Me" relation value
 * (isCurrentWorkspaceMemberSelected). Unverified on a live 2.41 server: if the
 * sync rejects it, drop that filter and let staff pick "Me" in the UI.
 */
import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const E = IDS.enquiry.fields;
const V = IDS.views.myTickets;

export default defineView({
  universalIdentifier: V.view,
  name: 'My tickets · 我的工单',
  objectUniversalIdentifier: IDS.enquiry.object,
  type: ViewType.TABLE,
  icon: 'IconUserCheck',
  position: 2,
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
      fieldMetadataUniversalIdentifier: E.assignedTo,
      operand: ViewFilterOperand.IS,
      value: { isCurrentWorkspaceMemberSelected: true, selectedRecordIds: [] },
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
