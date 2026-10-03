/**
 * "Inbox" — Enquiries grouped by status. Columns come from ENQUIRY_STATUS so
 * the board and the select can't drift.
 */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { ENQUIRY_STATUS } from '../options';
import { columns } from './columns';

const E = IDS.enquiry.fields;
const V = IDS.views.enquiriesKanban;

export default defineView({
  universalIdentifier: V.view,
  name: 'Inbox · 收件箱',
  objectUniversalIdentifier: IDS.enquiry.object,
  type: ViewType.KANBAN,
  icon: 'IconLayoutKanban',
  position: 1,
  mainGroupByFieldMetadataUniversalIdentifier: E.status,
  shouldHideEmptyGroups: false,
  groups: ENQUIRY_STATUS.map((status) => ({
    universalIdentifier: V.groups[status.position],
    fieldValue: status.value,
    position: status.position,
    isVisible: true,
  })),
  fields: columns(V.fields, [
    [E.reference, 150],
    [E.subject, 200],
    [E.priority, 110],
    [E.relatedCompany, 160],
  ]),
});
