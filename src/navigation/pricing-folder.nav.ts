/**
 * Sidebar: the "Pricing" folder (C2) — Offerings, Client Price Agreements and
 * Discount Rules sit inside it (their `folderUniversalIdentifier`). Takes the
 * place the Pricing view item had, under Product Streams.
 */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.pricingFolder,
  type: NavigationMenuItemType.FOLDER,
  name: 'Pricing',
  icon: 'IconReceipt2',
  position: 6,
});
