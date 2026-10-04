/** Fields widget for the Training Event record page's Overview tab. */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const E = IDS.trainingEvent.fields;
const V = IDS.views.trainingEventOverviewFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Overview · 概览',
  objectUniversalIdentifier: IDS.trainingEvent.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconSchool',
  position: 0,
  fields: columns(V.fields, [
    [E.date, 0],
    [E.channel, 0],
    [E.language, 0],
    [E.location, 0],
    [E.attendeeCount, 0],
    [E.company, 0],
  ]),
});
