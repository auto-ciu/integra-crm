/** Sidebar: Enquiries — the object's plural label, under Today. */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.enquiries,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: IDS.enquiry.object,
  position: 4,
});
