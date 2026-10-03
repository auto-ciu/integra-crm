/**
 * Fields widget for the Enquiry record page's Triage tab: the fields staff
 * (and later the AI triage job) set while working the ticket.
 */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const E = IDS.enquiry.fields;
const V = IDS.views.enquiryTriageFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Triage · 分诊',
  objectUniversalIdentifier: IDS.enquiry.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconStethoscope',
  position: 0,
  fields: columns(V.fields, [
    [E.status, 0],
    [E.priority, 0],
    [E.category, 0],
    [E.language, 0],
    [E.spamCheck, 0],
    [E.triageNotes, 0],
    [E.closedAt, 0],
  ]),
});
