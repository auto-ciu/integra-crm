/** Sidebar: Product Streams — the object's plural label, under Enquiries. */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.productStreams,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: IDS.productStream.object,
  position: 5,
});
