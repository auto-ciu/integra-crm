/** Person.streamContacts — inverse side of StreamContact.person. */
import { defineField } from '../../lib/sdk';
import { oneToMany } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...oneToMany({
    universalIdentifier: IDS.person.fields.streamContacts,
    name: 'streamContacts',
    label: 'Product streams · 产品线',
    icon: 'IconStack2',
    targetObjectId: IDS.streamContact.object,
    inverseFieldId: IDS.streamContact.fields.person,
  }),
});
