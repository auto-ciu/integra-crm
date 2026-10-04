/** Stream Stage record page: Overview. */
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from '../lib/sdk';
import { IDS } from '../ids';

const L = IDS.pageLayouts.streamStageRecord;

export default definePageLayout({
  universalIdentifier: L.layout,
  name: 'Stream Stage',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: IDS.streamStage.object,
  tabs: [
    {
      universalIdentifier: L.tabs.overview,
      title: 'Overview',
      icon: 'IconListNumbers',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.overviewFields,
          title: 'Overview',
          type: WidgetType.FIELDS,
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: IDS.views.streamStageOverviewFields.view,
          },
          heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT,
        },
      ],
    },
  ],
});
