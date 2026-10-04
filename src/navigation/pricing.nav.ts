/**
 * Sidebar: "Pricing" — a VIEW item (not OBJECT) so the label is "Pricing"
 * rather than the object's plural "Pricing Strategies". Under Product Streams.
 */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.pricing,
  type: NavigationMenuItemType.VIEW,
  name: 'Pricing',
  icon: 'IconReceipt2',
  viewUniversalIdentifier: IDS.views.pricingStrategiesTable.view,
  position: 6,
});
