/**
 * Sidebar: "Portal Events" — a VIEW item on the Customer Events table, so the
 * label is "Portal Events" rather than the object's plural. After Lead Discovery.
 */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.portalEvents,
  type: NavigationMenuItemType.VIEW,
  name: 'Portal Events',
  icon: 'IconActivity',
  viewUniversalIdentifier: IDS.views.customerEventsTable.view,
  position: 8,
});
