/** Company.trainingEvents — inverse side of TrainingEvent.company. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.company.object,
  ...oneToMany({
    universalIdentifier: IDS.company.fields.trainingEvents,
    name: 'trainingEvents',
    label: 'Training events · 培训活动',
    icon: 'IconSchool',
    targetObjectId: IDS.trainingEvent.object,
    inverseFieldId: IDS.trainingEvent.fields.company,
  }),
});
