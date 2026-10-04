/**
 * Product Stream record page: Overview / Updates / Documents / Contacts / Pipeline.
 *
 * Overview is a FIELDS widget (views/stream-overview-fields.view.ts); the
 * other three are RECORD_TABLE widgets over the stream's children, each with
 * its own TABLE_WIDGET view (views/stream-{detail,documents,contacts}.view.ts).
 * Pipeline is the StreamKpiWidget over the stream's opportunity lines
 * (views/stream-opportunity-lines.view.ts).
 */
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from '../lib/sdk';
import { IDS } from '../ids';

const L = IDS.pageLayouts.productStreamRecord;

const FIT = PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT;
const FILL = PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT;

export default definePageLayout({
  universalIdentifier: L.layout,
  name: 'Product Stream',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: IDS.productStream.object,
  tabs: [
    {
      universalIdentifier: L.tabs.overview,
      title: 'Overview',
      icon: 'IconStack2',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.overviewFields,
          title: 'Overview',
          type: WidgetType.FIELDS,
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: IDS.views.streamOverviewFields.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.updates,
      title: 'Updates',
      icon: 'IconNews',
      position: 1,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.updates,
          title: 'Updates',
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.streamUpdate.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.streamUpdatesWidget.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.documents,
      title: 'Documents',
      icon: 'IconFolder',
      position: 2,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.documents,
          title: 'Documents',
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.streamDocument.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.streamDocumentsWidget.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.contacts,
      title: 'Contacts',
      icon: 'IconAddressBook',
      position: 3,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.contacts,
          title: 'Contacts',
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.streamContact.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.streamContactsWidget.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.pipeline,
      title: 'Pipeline',
      icon: 'IconListDetails',
      position: 4,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.streamKpi,
          title: 'Stream KPIs',
          type: WidgetType.FRONT_COMPONENT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: IDS.frontComponents.streamKpiWidget,
          },
          heightBehavior: FIT,
        },
        {
          universalIdentifier: L.widgets.opportunityLines,
          title: 'Opportunity Lines',
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.opportunityLine.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.streamOpportunityLinesWidget.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
  ],
});
