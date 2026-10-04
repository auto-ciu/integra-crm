/**
 * WorkspaceMember.pricingPublications — inverse side of
 * PricingPublication.publishedBy. Same unverified-on-2.41 caveat as
 * enquiry-routing-rules.field.ts: if `twenty dev` rejects an app field on
 * workspaceMember, delete this file and make publishedBy a TEXT field.
 */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.workspaceMember.object,
  ...oneToMany({
    universalIdentifier: IDS.workspaceMember.fields.pricingPublications,
    name: 'pricingPublications',
    label: 'Pricing publications · 价格发布',
    icon: 'IconCloudUpload',
    targetObjectId: IDS.pricingPublication.object,
    inverseFieldId: IDS.pricingPublication.fields.publishedBy,
  }),
});
