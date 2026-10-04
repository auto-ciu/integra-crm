/** Fields widget for the Client Price Agreement record page's Overview tab. */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const A = IDS.clientPriceAgreement.fields;
const V = IDS.views.clientPriceAgreementOverviewFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Overview · 概览',
  objectUniversalIdentifier: IDS.clientPriceAgreement.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconFileDollar',
  position: 0,
  fields: columns(V.fields, [
    [A.name, 0],
    [A.agreementCode, 0],
    [A.client, 0],
    [A.contact, 0],
    [A.opportunity, 0],
    [A.status, 0],
    [A.agreementType, 0],
    [A.startDate, 0],
    [A.endDate, 0],
    [A.signedAt, 0],
    [A.signedBy, 0],
    [A.preparedBy, 0],
    [A.notes, 0],
  ]),
});
