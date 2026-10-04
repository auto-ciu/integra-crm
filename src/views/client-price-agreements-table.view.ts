/**
 * "Client Price Agreements" — every agreement, newest start first (the
 * sidebar's Pricing › Client Price Agreements item opens this view).
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const A = IDS.clientPriceAgreement.fields;
const V = IDS.views.clientPriceAgreementsTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Client Price Agreements · 客户价格协议',
  objectUniversalIdentifier: IDS.clientPriceAgreement.object,
  type: ViewType.TABLE,
  icon: 'IconFileDollar',
  position: 0,
  fields: columns(V.fields, [
    [A.name, 240],
    [A.agreementCode, 150],
    [A.client, 200],
    [A.status, 120],
    [A.agreementType, 170],
    [A.startDate, 130],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: A.startDate,
      direction: ViewSortDirection.DESC,
    },
  ],
});
