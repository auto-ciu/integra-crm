/** "Contacts" — table widget of Stream Contacts on the Product Stream record page. */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const C = IDS.streamContact.fields;
const V = IDS.views.streamContactsWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Contacts · 联系人',
  objectUniversalIdentifier: IDS.streamContact.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconAddressBook',
  position: 0,
  fields: columns(V.fields, [
    [C.person, 200],
    [C.role, 130],
    [C.notes, 320],
  ]),
});
