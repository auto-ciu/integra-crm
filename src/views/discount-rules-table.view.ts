/**
 * "Discount Rules" — the approval thresholds, strictest first (the sidebar's
 * Pricing › Discount Rules item opens this view).
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const R = IDS.discountRule.fields;
const V = IDS.views.discountRulesTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Discount Rules · 折扣规则',
  objectUniversalIdentifier: IDS.discountRule.object,
  type: ViewType.TABLE,
  icon: 'IconDiscount2',
  position: 0,
  fields: columns(V.fields, [
    [R.name, 240],
    [R.offering, 200],
    [R.maxDiscountPercent, 140],
    [R.approver, 180],
    [R.minAgreementValueEur, 190],
    [R.isActive, 100],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: R.maxDiscountPercent,
      direction: ViewSortDirection.ASC,
    },
  ],
});
