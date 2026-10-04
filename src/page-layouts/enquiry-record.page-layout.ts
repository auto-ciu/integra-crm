/**
 * Enquiry record page: Thread / Details / Macros (E3).
 *
 * Thread carries the Assign-to-me / Resolve bar and the PromoteToLeadButton
 * above the conversation table. Details stacks three FIELDS widgets (ticket,
 * requester, triage), each scoped by its own FIELDS_WIDGET view
 * (views/enquiry-*-fields.view.ts). Macros is ApplyMacroPanel. The FIELD widget's
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
      title: 'Thread',
      icon: 'IconMessages',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.actionsBar,
          title: 'Ticket actions',
          type: WidgetType.FRONT_COMPONENT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: IDS.frontComponents.enquiryActionsBar,
          },
          heightBehavior: FIT,
        },
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
      universalIdentifier: L.tabs.details,
      title: 'Details',
      icon: 'IconListDetails',
      position: 1,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.ticketFields,
          title: 'Ticket',
          type: WidgetType.FIELDS,
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: IDS.views.enquiryTicketFields.view,
          },
          heightBehavior: FIT,
        },
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
    {
      universalIdentifier: L.tabs.macros,
      title: 'Macros',
      icon: 'IconBolt',
      position: 2,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.applyMacro,
          title: 'Macros',
          type: WidgetType.FRONT_COMPONENT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: IDS.frontComponents.applyMacroPanel,
          },
          heightBehavior: FILL,
        },
      ],
    },
  ],
});
