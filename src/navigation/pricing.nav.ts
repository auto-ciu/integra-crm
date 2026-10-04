/**
 * Sidebar: "Pricing" — a VIEW item (not OBJECT) so the label is "Pricing"
 * rather than the object's plural "Offerings". Under Product Streams.
 */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.pricing,
  type: NavigationMenuItemType.VIEW,
  name: 'Pricing',
  icon: 'IconReceipt2',
  viewUniversalIdentifier: IDS.views.offeringsTable.view,
  position: 6,
});
