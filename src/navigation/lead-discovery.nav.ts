/**
 * Sidebar: "Lead Discovery" — a VIEW item on the Lead Discovery Runs table,
 * so the label is "Lead Discovery" rather than the object's plural. Last.
 */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.leadDiscovery,
  type: NavigationMenuItemType.VIEW,
  name: 'Lead Discovery',
  icon: 'IconRadar',
  viewUniversalIdentifier: IDS.views.leadDiscoveryRunsTable.view,
  position: 7,
});
