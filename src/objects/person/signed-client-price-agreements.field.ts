/** Person.signedClientPriceAgreements — inverse side of ClientPriceAgreement.signedBy. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...oneToMany({
    universalIdentifier: IDS.person.fields.signedClientPriceAgreements,
    name: 'signedClientPriceAgreements',
    label: 'Signed price agreements · 已签价格协议',
    icon: 'IconSignature',
    targetObjectId: IDS.clientPriceAgreement.object,
    inverseFieldId: IDS.clientPriceAgreement.fields.signedBy,
  }),
});
