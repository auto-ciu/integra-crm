/**
 * Stream Contact — a Person attached to a product stream as its lead, an
 * expert, or support. `name` is the label (a relation can't be), e.g.
 * "Battery — Li-ion · Wei Li".
 */
import { defineObject } from '../lib/sdk';
import { manyToOne, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import { STREAM_CONTACT_ROLE } from '../options';

const F = IDS.streamContact.fields;

export default defineObject({
  universalIdentifier: IDS.streamContact.object,
  nameSingular: 'streamContact',
  namePlural: 'streamContacts',
  labelSingular: 'Stream Contact',
  labelPlural: 'Stream Contacts',
  description: 'A person who leads, advises on or supports a product stream',
  icon: 'IconAddressBook',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconAddressBook',
    }),
    manyToOne({
      universalIdentifier: F.stream,
      name: 'stream',
      label: 'Stream · 产品线',
      icon: 'IconStack2',
      targetObjectId: IDS.productStream.object,
      inverseFieldId: IDS.productStream.fields.contacts,
    }),
    manyToOne({
      universalIdentifier: F.person,
      name: 'person',
      label: 'Person · 联系人',
      icon: 'IconUser',
      targetObjectId: STANDARD.person.object,
      inverseFieldId: IDS.person.fields.streamContacts,
    }),
    select({
      universalIdentifier: F.role,
      name: 'role',
      label: 'Role · 角色',
      icon: 'IconUserStar',
      options: STREAM_CONTACT_ROLE,
      defaultValue: 'EXPERT',
    }),
    text({
      universalIdentifier: F.notes,
      name: 'notes',
      label: 'Notes · 备注',
      icon: 'IconNotes',
    }),
  ],
});
