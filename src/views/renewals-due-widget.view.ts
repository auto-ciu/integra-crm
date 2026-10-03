/**
 * "Renewals due" — a table WIDGET (urgency ∈ {DUE, OVERDUE}) embedded in the
 * Today dashboard under the count widget.
 */
import { defineView, ViewFilterOperand, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const M = IDS.arMandate.fields;
const D = IDS.views.renewalsDueWidget;

export default defineView({
  universalIdentifier: D.view,
  name: 'Renewals due · 到期续约',
  objectUniversalIdentifier: IDS.arMandate.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconAlarm',
  position: 1,
  fields: columns(D.fields, [
    [M.name, 220],
    [M.urgency, 110],
    [M.renewalDate, 130],
    [M.company, 180],
  ]),
  filters: [
    {
      universalIdentifier: D.filter,
      fieldMetadataUniversalIdentifier: M.urgency,
      operand: ViewFilterOperand.IS,
      value: ['DUE', 'OVERDUE'],
    },
  ],
  sorts: [
    {
      universalIdentifier: D.sort,
      fieldMetadataUniversalIdentifier: M.renewalDate,
      direction: ViewSortDirection.ASC,
    },
  ],
});
