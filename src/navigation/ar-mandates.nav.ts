/**
 * Sidebar: "AR Mandates" — the object's plural label (e2e matcher `^ar mandates?$`).
 */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.arMandates,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: IDS.arMandate.object,
  position: 1,
});
