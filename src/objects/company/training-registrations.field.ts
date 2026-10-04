/** Company.trainingRegistrations — inverse side of TrainingRegistration.company. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.company.object,
  ...oneToMany({
    universalIdentifier: IDS.company.fields.trainingRegistrations,
    name: 'trainingRegistrations',
    label: 'Training registrations · 培训报名',
    icon: 'IconTicket',
    targetObjectId: IDS.trainingRegistration.object,
    inverseFieldId: IDS.trainingRegistration.fields.company,
  }),
});
