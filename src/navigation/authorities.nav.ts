/** Sidebar: Authorities. */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.authorities,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: IDS.authority.object,
  position: 3,
});
