/** Opportunity.productLine — Integra extension of the standard Opportunity object. */
import { defineField } from '../../lib/sdk';
import { select } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';
import { PRODUCT_LINE } from '../../options';

export default defineField({
  objectUniversalIdentifier: STANDARD.opportunity.object,
  ...select({
    universalIdentifier: IDS.opportunity.fields.productLine,
    name: 'productLine',
    label: 'Product line · 产品线',
    icon: 'IconPackages',
    options: PRODUCT_LINE,
  }),
});
