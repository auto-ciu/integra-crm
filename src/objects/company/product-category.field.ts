/** Company.productCategory — Integra extension of the standard Company object. */
import { defineField } from '../../lib/sdk';
import { select } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';
import { PRODUCT_CATEGORY } from '../../options';

export default defineField({
  objectUniversalIdentifier: STANDARD.company.object,
  ...select({
    universalIdentifier: IDS.company.fields.productCategory,
    name: 'productCategory',
    label: 'Product category · 产品类别',
    icon: 'IconBatteryCharging',
    options: PRODUCT_CATEGORY,
  }),
});
