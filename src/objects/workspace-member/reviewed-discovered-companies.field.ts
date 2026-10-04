/**
 * WorkspaceMember.reviewedDiscoveredCompanies — inverse side of
 * DiscoveredCompany.reviewedBy. Same caveat as lead-imports.field.ts.
 */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.workspaceMember.object,
  ...oneToMany({
    universalIdentifier: IDS.workspaceMember.fields.reviewedDiscoveredCompanies,
    name: 'reviewedDiscoveredCompanies',
    label: 'Reviewed leads · 已审核线索',
    icon: 'IconUserCheck',
    targetObjectId: IDS.discoveredCompany.object,
    inverseFieldId: IDS.discoveredCompany.fields.reviewedBy,
  }),
});
