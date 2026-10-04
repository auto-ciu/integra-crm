/**
 * Fields widget for the Enquiry record page's Details tab: the E3 ticket
 * fields (assignee, priority, tags, SLA clock, resolution, notes).
 */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const E = IDS.enquiry.fields;
const V = IDS.views.enquiryTicketFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Ticket · 工单',
  objectUniversalIdentifier: IDS.enquiry.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconTicket',
  position: 0,
  fields: columns(V.fields, [
    [E.assignedTo, 0],
    [E.priority, 0],
    [E.tags, 0],
    [E.slaTarget, 0],
    [E.firstResponseAt, 0],
    [E.lastActivityAt, 0],
    [E.resolution, 0],
    [E.satisfaction, 0],
    [E.sourceUrl, 0],
    [E.internalNotes, 0],
  ]),
});
