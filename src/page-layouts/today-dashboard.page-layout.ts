/**
 * "Today" — the operator's landing page. A standalone page layout (no record
 * behind it) reached from the sidebar item in ../navigation/today.nav.ts.
 *
 * Grid: 12 columns. RenewalCountWidget on the left, the "Renewals due" table
 * widget on the right so the number and the names are on one screen; the
 * TicketStatsWidget (E3) sits under the count.
 */
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  WidgetType,
  type PageLayoutWidgetGridPosition,
} from '../lib/sdk';
import { IDS } from '../ids';

const L = IDS.pageLayouts.todayDashboard;

const grid = (row: number, column: number, rowSpan: number, columnSpan: number): PageLayoutWidgetGridPosition => ({
  layoutMode: PageLayoutTabLayoutMode.GRID,
  row,
  column,
  rowSpan,
  columnSpan,
});

export default definePageLayout({
  universalIdentifier: L.layout,
  name: 'Today',
  type: PageLayoutType.STANDALONE_PAGE,
  tabs: [
    {
      universalIdentifier: L.tabs.today,
      title: 'Today',
      icon: 'IconSunrise',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: L.widgets.renewalCount,
          title: 'Renewals < 90 days',
          type: WidgetType.FRONT_COMPONENT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: IDS.frontComponents.renewalCountWidget,
          },
          position: grid(0, 0, 4, 5),
        },
        {
          universalIdentifier: L.widgets.renewalsDue,
          title: 'Renewals due',
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.arMandate.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.renewalsDueWidget.view,
          },
          position: grid(0, 5, 8, 7),
        },
        {
          universalIdentifier: L.widgets.ticketStats,
          title: 'Tickets',
          type: WidgetType.FRONT_COMPONENT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: IDS.frontComponents.ticketStatsWidget,
          },
          position: grid(4, 0, 4, 5),
        },
      ],
    },
  ],
});
