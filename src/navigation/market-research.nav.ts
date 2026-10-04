/**
 * Sidebar: "Market Research" — a VIEW item on the Research Briefs table, so
 * the label is "Market Research" rather than the object's plural. Last.
 */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.marketResearch,
  type: NavigationMenuItemType.VIEW,
  name: 'Market Research',
  icon: 'IconTelescope',
  viewUniversalIdentifier: IDS.views.researchBriefsTable.view,
  position: 9,
});
