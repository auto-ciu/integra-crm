/** Sidebar: Stream Stages — the pipeline stages, under Product Streams and Pricing. */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.streamStages,
  type: NavigationMenuItemType.VIEW,
  name: 'Stream Stages',
  icon: 'IconListNumbers',
  viewUniversalIdentifier: IDS.views.streamStagesTable.view,
  position: 7,
});
