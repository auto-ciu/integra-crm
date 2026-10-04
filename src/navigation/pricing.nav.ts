/**
 * Sidebar: Pricing › Offerings — a VIEW item (not OBJECT) opening the
 * Offerings table, first in the Pricing folder (pricing-folder.nav.ts).
 */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.pricing,
  type: NavigationMenuItemType.VIEW,
  name: 'Offerings',
  icon: 'IconReceipt2',
  viewUniversalIdentifier: IDS.views.offeringsTable.view,
  folderUniversalIdentifier: IDS.navigation.pricingFolder,
  position: 0,
});
