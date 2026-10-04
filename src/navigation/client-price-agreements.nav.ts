/** Sidebar: Pricing › Client Price Agreements (C2), in the Pricing folder. */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.clientPriceAgreements,
  type: NavigationMenuItemType.VIEW,
  name: 'Client Price Agreements',
  icon: 'IconFileDollar',
  viewUniversalIdentifier: IDS.views.clientPriceAgreementsTable.view,
  folderUniversalIdentifier: IDS.navigation.pricingFolder,
  position: 1,
});
