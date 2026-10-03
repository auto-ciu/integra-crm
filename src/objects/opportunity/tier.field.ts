/** Opportunity.tier — Integra extension of the standard Opportunity object. */
import { defineField } from '../../lib/sdk';
import { select } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';
import { TIER } from '../../options';

export default defineField({
  objectUniversalIdentifier: STANDARD.opportunity.object,
  ...select({
    universalIdentifier: IDS.opportunity.fields.tier,
    name: 'tier',
    label: 'Tier · 层级',
    icon: 'IconStairs',
    options: TIER,
  }),
});
