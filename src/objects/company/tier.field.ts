/** Company.tier — Integra extension of the standard Company object. */
import { defineField } from '../../lib/sdk';
import { select } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';
import { TIER } from '../../options';

export default defineField({
  objectUniversalIdentifier: STANDARD.company.object,
  ...select({
    universalIdentifier: IDS.company.fields.tier,
    name: 'tier',
    label: 'Tier · 层级',
    icon: 'IconStairs',
    options: TIER,
  }),
});
