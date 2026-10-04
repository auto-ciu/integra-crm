/** Opportunity.opportunityLines — inverse side of OpportunityLine.opportunity. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.opportunity.object,
  ...oneToMany({
    universalIdentifier: IDS.opportunity.fields.opportunityLines,
    name: 'opportunityLines',
    label: 'Opportunity lines · 商机明细',
    icon: 'IconListDetails',
    targetObjectId: IDS.opportunityLine.object,
    inverseFieldId: IDS.opportunityLine.fields.opportunity,
  }),
});
