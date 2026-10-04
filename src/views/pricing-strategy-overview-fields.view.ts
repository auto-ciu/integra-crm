/** Fields widget for the Pricing Strategy record page's Overview tab. */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const S = IDS.pricingStrategy.fields;
const V = IDS.views.pricingStrategyOverviewFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Overview · 概览',
  objectUniversalIdentifier: IDS.pricingStrategy.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconReceipt2',
  position: 0,
  fields: columns(V.fields, [
    [S.name, 0],
    [S.strategyType, 0],
    [S.displayMode, 0],
    [S.isActive, 0],
    [S.validFrom, 0],
    [S.validUntil, 0],
    [S.correlationId, 0],
    [S.sortOrder, 0],
    [S.description, 0],
  ]),
});
