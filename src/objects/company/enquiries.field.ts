/** Company.enquiries — inverse side of Enquiry.relatedCompany. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.company.object,
  ...oneToMany({
    universalIdentifier: IDS.company.fields.enquiries,
    name: 'enquiries',
    label: 'Enquiries · 咨询',
    icon: 'IconInbox',
    targetObjectId: IDS.enquiry.object,
    inverseFieldId: IDS.enquiry.fields.relatedCompany,
  }),
});
