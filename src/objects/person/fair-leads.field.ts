/** Person.fairLeads — inverse side of FairLead.person. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...oneToMany({
    universalIdentifier: IDS.person.fields.fairLeads,
    name: 'fairLeads',
    label: 'Fair leads · 展会线索',
    icon: 'IconTicket',
    targetObjectId: IDS.fairLead.object,
    inverseFieldId: IDS.fairLead.fields.person,
  }),
});
