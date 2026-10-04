/** Sidebar: "Ticket inbox" — a VIEW item after the other sidebar items (E3). */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.staffTicketInbox,
  type: NavigationMenuItemType.VIEW,
  name: 'Ticket inbox',
  icon: 'IconInbox',
  viewUniversalIdentifier: IDS.views.staffTicketInbox.view,
  position: 11,
});
