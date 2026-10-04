/**
 * "Training Registrations" — every registration across events (X5), newest
 * first.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const T = IDS.trainingRegistration.fields;
const V = IDS.views.trainingRegistrationsTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Training Registrations · 培训报名',
  objectUniversalIdentifier: IDS.trainingRegistration.object,
  type: ViewType.TABLE,
  icon: 'IconTicket',
  position: 0,
  fields: columns(V.fields, [
    [T.trainingEvent, 240],
    [T.person, 180],
    [T.company, 180],
    [T.status, 120],
    [T.registrationDate, 150],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: T.registrationDate,
      direction: ViewSortDirection.DESC,
    },
  ],
});
