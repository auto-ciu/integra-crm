/** Company.clientPriceAgreements — inverse side of ClientPriceAgreement.client. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.company.object,
  ...oneToMany({
    universalIdentifier: IDS.company.fields.clientPriceAgreements,
    name: 'clientPriceAgreements',
    label: 'Price agreements · 价格协议',
    icon: 'IconFileDollar',
    targetObjectId: IDS.clientPriceAgreement.object,
    inverseFieldId: IDS.clientPriceAgreement.fields.client,
  }),
});
