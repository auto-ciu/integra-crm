/** Sidebar: "My tickets" — a VIEW item after the other sidebar items (E3). */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.myTickets,
  type: NavigationMenuItemType.VIEW,
  name: 'My tickets',
  icon: 'IconUserCheck',
  viewUniversalIdentifier: IDS.views.myTickets.view,
  position: 12,
});
