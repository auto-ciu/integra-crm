/** Person.leadSource — how the person was discovered (fair, walk-in, online, etc). */
import { defineField } from '../../lib/sdk';
import { select } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';
import { FAIR_LEAD_SOURCE } from '../../options';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...select({
    universalIdentifier: IDS.person.fields.leadSource,
    name: 'leadSource',
    label: 'Lead Source · 线索来源',
    icon: 'IconMapPin',
    options: FAIR_LEAD_SOURCE,
  }),
});
