/** Sidebar: Training Events. */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.trainingEvents,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: IDS.trainingEvent.object,
  position: 2,
});
