/**
 * Research Brief record page: Overview / Raw Result.
 *
 * Overview is a FIELDS widget with every field
 * (views/research-brief-overview-fields.view.ts); Raw Result is a FIELDS
 * widget with just Claude's answer (views/research-brief-result-fields.view.ts).
 */
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from '../lib/sdk';
import { IDS } from '../ids';

const L = IDS.pageLayouts.researchBriefRecord;

const FIT = PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT;

export default definePageLayout({
  universalIdentifier: L.layout,
  name: 'Research Brief',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: IDS.researchBrief.object,
  tabs: [
    {
      universalIdentifier: L.tabs.overview,
      title: 'Overview',
      icon: 'IconTelescope',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.overviewFields,
          title: 'Overview',
          type: WidgetType.FIELDS,
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: IDS.views.researchBriefOverviewFields.view,
          },
          heightBehavior: FIT,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.rawResult,
      title: 'Raw Result',
      icon: 'IconFileText',
      position: 1,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.rawResult,
          title: 'Raw Result',
          type: WidgetType.FIELDS,
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: IDS.views.researchBriefResultFields.view,
          },
          heightBehavior: FIT,
        },
      ],
    },
  ],
});
