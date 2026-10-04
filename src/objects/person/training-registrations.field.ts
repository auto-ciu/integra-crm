/** Person.trainingRegistrations — inverse side of TrainingRegistration.person. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...oneToMany({
    universalIdentifier: IDS.person.fields.trainingRegistrations,
    name: 'trainingRegistrations',
    label: 'Training registrations · 培训报名',
    icon: 'IconTicket',
    targetObjectId: IDS.trainingRegistration.object,
    inverseFieldId: IDS.trainingRegistration.fields.person,
  }),
});
