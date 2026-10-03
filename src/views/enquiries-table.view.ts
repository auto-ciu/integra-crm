/**
 * "Enquiries" — the inbox as a table, newest first.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns, systemFieldId } from './columns';

const E = IDS.enquiry.fields;
const V = IDS.views.enquiriesTable;
const createdAt = systemFieldId(IDS.enquiry.object, 'createdAt');

export default defineView({
  universalIdentifier: V.view,
  name: 'Enquiries · 咨询',
  objectUniversalIdentifier: IDS.enquiry.object,
  type: ViewType.TABLE,
  icon: 'IconInbox',
  position: 0,
  fields: columns(V.fields, [
    [E.reference, 150],
    [E.status, 110],
    [E.priority, 110],
    [E.subject, 260],
    [E.relatedCompany, 180],
    [E.relatedPerson, 160],
    [createdAt, 150],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: createdAt,
      direction: ViewSortDirection.DESC,
    },
  ],
});
