/**
 * WorkspaceMember.subscribedResearchBrief — inverse side of
 * ResearchBrief.subscribers (the members who get a brief's digest).
 */
import { defineField } from '../../lib/sdk';
import { manyToOne } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.workspaceMember.object,
  ...manyToOne({
    universalIdentifier: IDS.workspaceMember.fields.subscribedResearchBrief,
    name: 'subscribedResearchBrief',
    label: 'Research brief · 订阅的研究简报',
    icon: 'IconTelescope',
    targetObjectId: IDS.researchBrief.object,
    inverseFieldId: IDS.researchBrief.fields.subscribers,
  }),
});
