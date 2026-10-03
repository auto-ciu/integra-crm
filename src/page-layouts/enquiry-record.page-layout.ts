/**
 * Enquiry record page: Messages / Requester / Triage.
 *
 * Messages carries the PromoteToLeadButton above the conversation table.
 * Requester and Triage are FIELDS widgets, each scoped by its own
 * FIELDS_WIDGET view (views/enquiry-*-fields.view.ts). The FIELD widget's
 * config takes a workspace `fieldMetadataId` that the SDK does not map from a
 * universal id, so it can't be used from an app manifest.
 */
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from '../lib/sdk';
import { IDS } from '../ids';

const L = IDS.pageLayouts.enquiryRecord;

const FIT = PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT;
const FILL = PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT;

export default definePageLayout({
  universalIdentifier: L.layout,
  name: 'Enquiry',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: IDS.enquiry.object,
  tabs: [
    {
      universalIdentifier: L.tabs.messages,
      title: 'Messages',
      icon: 'IconMessages',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.promoteToLead,
          title: 'Promote to lead',
          type: WidgetType.FRONT_COMPONENT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: IDS.frontComponents.promoteToLeadButton,
          },
          heightBehavior: FIT,
        },
        {
          universalIdentifier: L.widgets.messages,
          title: 'Messages',
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.enquiryMessage.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.enquiryMessagesWidget.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.requester,
      title: 'Requester',
      icon: 'IconUser',
      position: 1,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.requesterFields,
          title: 'Requester',
          type: WidgetType.FIELDS,
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: IDS.views.enquiryRequesterFields.view,
          },
          heightBehavior: FIT,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.triage,
      title: 'Triage',
      icon: 'IconStethoscope',
      position: 2,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.triageFields,
          title: 'Triage',
          type: WidgetType.FIELDS,
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: IDS.views.enquiryTriageFields.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
  ],
});
