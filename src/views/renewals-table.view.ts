/**
 * "Renewals" — the AR Mandates index, ascending by renewal date, urgency as
 * the SECOND column so the eye lands on it right after the name.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const M = IDS.arMandate.fields;
const R = IDS.views.renewalsTable;

export default defineView({
  universalIdentifier: R.view,
  name: 'Renewals · 续约',
  objectUniversalIdentifier: IDS.arMandate.object,
  type: ViewType.TABLE,
  icon: 'IconCalendarRepeat',
  position: 0,
  fields: columns(R.fields, [
    [M.name, 220],
    [M.urgency, 110],
    [M.renewalDate, 130],
    [M.status, 120],
    [M.company, 180],
    [M.annualFee, 120],
  ]),
  sorts: [
    {
      universalIdentifier: R.sort,
      fieldMetadataUniversalIdentifier: M.renewalDate,
      direction: ViewSortDirection.ASC,
    },
  ],
});
