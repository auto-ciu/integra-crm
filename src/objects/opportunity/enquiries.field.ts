/** Opportunity.enquiries — inverse side of Enquiry.relatedOpportunity. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.opportunity.object,
  ...oneToMany({
    universalIdentifier: IDS.opportunity.fields.enquiries,
    name: 'enquiries',
    label: 'Enquiries · 咨询',
    icon: 'IconInbox',
    targetObjectId: IDS.enquiry.object,
    inverseFieldId: IDS.enquiry.fields.relatedOpportunity,
  }),
});
