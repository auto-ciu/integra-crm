/** Opportunity Line record page: Overview. */
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from '../lib/sdk';
import { IDS } from '../ids';

const L = IDS.pageLayouts.opportunityLineRecord;

export default definePageLayout({
  universalIdentifier: L.layout,
  name: 'Opportunity Line',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: IDS.opportunityLine.object,
  tabs: [
    {
      universalIdentifier: L.tabs.overview,
      title: 'Overview',
      icon: 'IconListDetails',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.overviewFields,
          title: 'Overview',
          type: WidgetType.FIELDS,
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: IDS.views.opportunityLineOverviewFields.view,
          },
          heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT,
        },
      ],
    },
  ],
});
