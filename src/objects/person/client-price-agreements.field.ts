/** Person.clientPriceAgreements — inverse side of ClientPriceAgreement.contact. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...oneToMany({
    universalIdentifier: IDS.person.fields.clientPriceAgreements,
    name: 'clientPriceAgreements',
    label: 'Price agreements · 价格协议',
    icon: 'IconFileDollar',
    targetObjectId: IDS.clientPriceAgreement.object,
    inverseFieldId: IDS.clientPriceAgreement.fields.contact,
  }),
});
