/**
 * WorkspaceMember.suggestedResearchFindings — inverse side of
 * ResearchFinding.suggestedOwner.
 */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.workspaceMember.object,
  ...oneToMany({
    universalIdentifier: IDS.workspaceMember.fields.suggestedResearchFindings,
    name: 'suggestedResearchFindings',
    label: 'Suggested research findings · 建议跟进的发现',
    icon: 'IconBulb',
    targetObjectId: IDS.researchFinding.object,
    inverseFieldId: IDS.researchFinding.fields.suggestedOwner,
  }),
});
