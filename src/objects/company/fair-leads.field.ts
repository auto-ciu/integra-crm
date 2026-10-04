/** Company.fairLeads — inverse side of FairLead.company. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.company.object,
  ...oneToMany({
    universalIdentifier: IDS.company.fields.fairLeads,
    name: 'fairLeads',
    label: 'Fair leads · 展会线索',
    icon: 'IconTicket',
    targetObjectId: IDS.fairLead.object,
    inverseFieldId: IDS.fairLead.fields.company,
  }),
});
