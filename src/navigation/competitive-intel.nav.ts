/** Sidebar: Competitive Intel — competitors by risk level. */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.competitiveIntel,
  type: NavigationMenuItemType.VIEW,
  name: 'Competitive Intel',
  icon: 'IconSwords',
  viewUniversalIdentifier: IDS.views.competitiveIntelDashboard.view,
  position: 11,
});
