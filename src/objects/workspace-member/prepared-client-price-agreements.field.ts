/** WorkspaceMember.preparedClientPriceAgreements — inverse side of ClientPriceAgreement.preparedBy. Same unverified-on-2.41 caveat as pricing-publications.field.ts. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.workspaceMember.object,
  ...oneToMany({
    universalIdentifier: IDS.workspaceMember.fields.preparedClientPriceAgreements,
    name: 'preparedClientPriceAgreements',
    label: 'Prepared price agreements · 制定的价格协议',
    icon: 'IconFileDollar',
    targetObjectId: IDS.clientPriceAgreement.object,
    inverseFieldId: IDS.clientPriceAgreement.fields.preparedBy,
  }),
});
