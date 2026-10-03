/** Company.arMandates — inverse side of ArMandate.company. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.company.object,
  ...oneToMany({
    universalIdentifier: IDS.company.fields.arMandates,
    name: 'arMandates',
    label: 'AR Mandates · 授权委托',
    icon: 'IconFileCertificate',
    targetObjectId: IDS.arMandate.object,
    inverseFieldId: IDS.arMandate.fields.company,
  }),
});
