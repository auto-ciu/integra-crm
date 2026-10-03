/**
 * Fields widget for the Enquiry record page's Requester tab: who asked, and
 * where they came from.
 */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const E = IDS.enquiry.fields;
const V = IDS.views.enquiryRequesterFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Requester · 咨询人',
  objectUniversalIdentifier: IDS.enquiry.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconUser',
  position: 0,
  fields: columns(V.fields, [
    [E.relatedPerson, 0],
    [E.relatedCompany, 0],
    [E.relatedOpportunity, 0],
    [E.sourcePage, 0],
    [E.utmSource, 0],
    [E.utmMedium, 0],
    [E.utmCampaign, 0],
  ]),
});
