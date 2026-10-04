/**
 * Training Event record page: Overview / Registrations (X5).
 *
 * Overview leads with the RegisterForTrainingButton, then a FIELDS widget
 * (views/training-event-overview-fields.view.ts). Registrations is a
 * RECORD_TABLE widget (views/training-event-registrations.view.ts).
 */
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from '../lib/sdk';
import { IDS } from '../ids';

const L = IDS.pageLayouts.trainingEventRecord;

const FIT = PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT;
const FILL = PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT;

export default definePageLayout({
  universalIdentifier: L.layout,
  name: 'Training Event',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: IDS.trainingEvent.object,
  tabs: [
    {
      universalIdentifier: L.tabs.overview,
      title: 'Overview',
      icon: 'IconSchool',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.registerButton,
          title: 'Register',
          type: WidgetType.FRONT_COMPONENT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: IDS.frontComponents.registerForTrainingButton,
          },
          heightBehavior: FIT,
        },
        {
          universalIdentifier: L.widgets.overviewFields,
          title: 'Overview',
          type: WidgetType.FIELDS,
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: IDS.views.trainingEventOverviewFields.view,
          },
          heightBehavior: FIT,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.registrations,
      title: 'Registrations',
      icon: 'IconTicket',
      position: 1,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.registrations,
          title: 'Registrations',
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.trainingRegistration.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.trainingEventRegistrationsWidget.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
  ],
});
