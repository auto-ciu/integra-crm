/**
 * Sidebar: "Today". Must be exactly that — the e2e matcher is `^today$`.
 */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.today,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  name: 'Today',
  icon: 'IconSunrise',
  pageLayoutUniversalIdentifier: IDS.pageLayouts.todayDashboard.layout,
  position: 0,
});
