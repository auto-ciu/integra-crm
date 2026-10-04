/**
 * "Registrations" — table widget on the Training Event record page, in
 * registration order. As with the other record-page tables, the host is
 * expected to scope the relation-bound table to the current event.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const T = IDS.trainingRegistration.fields;
const V = IDS.views.trainingEventRegistrationsWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Registrations · 报名',
  objectUniversalIdentifier: IDS.trainingRegistration.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconTicket',
  position: 0,
  fields: columns(V.fields, [
    [T.person, 180],
    [T.company, 180],
    [T.status, 120],
    [T.registrationDate, 150],
    [T.dietaryRequirements, 180],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: T.registrationDate,
      direction: ViewSortDirection.ASC,
    },
  ],
});
