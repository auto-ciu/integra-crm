/** Fields widget for the Offering record page's Overview tab. */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const O = IDS.offering.fields;
const V = IDS.views.offeringOverviewFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Overview · 概览',
  objectUniversalIdentifier: IDS.offering.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconReceipt2',
  position: 0,
  fields: columns(V.fields, [
    [O.name, 0],
    [O.offeringCode, 0],
    [O.productCategory, 0],
    [O.strategyType, 0],
    [O.displayFormat, 0],
    [O.fromPrefix, 0],
    [O.hasOptionalExtras, 0],
    [O.isActive, 0],
    [O.validFrom, 0],
    [O.validUntil, 0],
    [O.sortOrder, 0],
    [O.description, 0],
    [O.features, 0],
  ]),
});
