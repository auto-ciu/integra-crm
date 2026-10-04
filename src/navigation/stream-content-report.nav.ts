/** Sidebar: Stream Content Report — updates by content category and publish state. */
import { defineNavigationMenuItem, NavigationMenuItemType } from '../lib/sdk';
import { IDS } from '../ids';

export default defineNavigationMenuItem({
  universalIdentifier: IDS.navigation.streamContentReport,
  type: NavigationMenuItemType.VIEW,
  name: 'Stream Content',
  icon: 'IconReportAnalytics',
  viewUniversalIdentifier: IDS.views.streamContentReport.view,
  position: 10,
});
