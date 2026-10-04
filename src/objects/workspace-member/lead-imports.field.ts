/**
 * WorkspaceMember.leadImports — inverse side of LeadImport.uploadedBy. Same
 * unverified-on-2.41 caveat as pricing-publications.field.ts: if `twenty dev`
 * rejects an app field on workspaceMember, delete this file and make
 * uploadedBy a TEXT field.
 */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.workspaceMember.object,
  ...oneToMany({
    universalIdentifier: IDS.workspaceMember.fields.leadImports,
    name: 'leadImports',
    label: 'Lead imports · 线索导入',
    icon: 'IconFileImport',
    targetObjectId: IDS.leadImport.object,
    inverseFieldId: IDS.leadImport.fields.uploadedBy,
  }),
});
