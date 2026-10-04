/** Sidebar: Pricing › Discount Rules (C2), in the Pricing folder. */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.discountRules,
  type: NavigationMenuItemType.VIEW,
  name: 'Discount Rules',
  icon: 'IconDiscount2',
  viewUniversalIdentifier: IDS.views.discountRulesTable.view,
  folderUniversalIdentifier: IDS.navigation.pricingFolder,
  position: 2,
});
