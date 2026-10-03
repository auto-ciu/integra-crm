/** Company.exportRevenueBand — Integra extension of the standard Company object. */
import { defineField } from '../../lib/sdk';
import { select } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';
import { EXPORT_REVENUE_BAND } from '../../options';

export default defineField({
  objectUniversalIdentifier: STANDARD.company.object,
  ...select({
    universalIdentifier: IDS.company.fields.exportRevenueBand,
    name: 'exportRevenueBand',
    label: 'Export revenue band · 出口营收区间',
    icon: 'IconCoinEuro',
    options: EXPORT_REVENUE_BAND,
  }),
});
