/** Person.enquiries — inverse side of Enquiry.relatedPerson. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...oneToMany({
    universalIdentifier: IDS.person.fields.enquiries,
    name: 'enquiries',
    label: 'Enquiries · 咨询',
    icon: 'IconInbox',
    targetObjectId: IDS.enquiry.object,
    inverseFieldId: IDS.enquiry.fields.relatedPerson,
  }),
});
