/** Company.province — Integra extension of the standard Company object. */
import { defineField } from '../../lib/sdk';
import { select } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';
import { PROVINCE } from '../../options';

export default defineField({
  objectUniversalIdentifier: STANDARD.company.object,
  ...select({
    universalIdentifier: IDS.company.fields.province,
    name: 'province',
    label: 'Province · 省份',
    icon: 'IconMapPin',
    options: PROVINCE,
  }),
});
