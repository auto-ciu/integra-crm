/** Sidebar: "Overdue tickets" — a VIEW item after the other sidebar items (E3). */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.overdueTickets,
  type: NavigationMenuItemType.VIEW,
  name: 'Overdue tickets',
  icon: 'IconFlameFilled',
  viewUniversalIdentifier: IDS.views.overdueTickets.view,
  position: 13,
});
