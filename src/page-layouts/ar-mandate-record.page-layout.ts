/**
 * AR Mandate record page: Overview / Documents / Products covered / Renewals /
 * Activity. The RenewalBanner front component sits at the top of Overview
 * (and again on Renewals, where the renewal fields are edited).
 *
 * Tabs and widgets are nested plain manifests: the SDK builder registers one
 * default-exported define*() per file, and define*() returns a
 * ValidationResult, not a manifest, so it cannot be nested.
 */
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
  type PageLayoutWidgetManifest,
} from '../lib/sdk';
import { IDS } from '../ids';

const L = IDS.pageLayouts.arMandateRecord;

/**
 * Vertical-list tabs stack widgets in array order. FIT sizes a widget to its
 * content; FILL lets it take the rest of the tab's viewport.
 */
const FIT = PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT;
const FILL = PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT;

const renewalBanner = (universalIdentifier: string): PageLayoutWidgetManifest => ({
  universalIdentifier,
  title: 'Renewal',
  type: WidgetType.FRONT_COMPONENT,
  configuration: {
    configurationType: 'FRONT_COMPONENT',
    frontComponentUniversalIdentifier: IDS.frontComponents.renewalBanner,
  },
  heightBehavior: FIT,
});

export default definePageLayout({
  universalIdentifier: L.layout,
  name: 'AR Mandate',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: IDS.arMandate.object,
  tabs: [
    {
      universalIdentifier: L.tabs.overview,
      title: 'Overview',
      icon: 'IconFileCertificate',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        renewalBanner(L.widgets.renewalBanner),
        {
          universalIdentifier: L.widgets.overviewFields,
          title: 'Mandate',
          type: WidgetType.FIELDS,
          configuration: { configurationType: 'FIELDS' },
          heightBehavior: FIT,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.documents,
      title: 'Documents',
      icon: 'IconFolder',
      position: 1,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.documents,
          title: 'Documents',
          type: WidgetType.FILES,
          // SDK 2.41 FILES widget config takes no field reference; which files it
          // lists (record attachments vs. the `documents` field) is unverified.
          configuration: { configurationType: 'FILES' },
          heightBehavior: FILL,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.productsCovered,
      title: 'Products covered',
      icon: 'IconPackages',
      position: 2,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.productsCovered,
          title: 'Products covered',
          // RECORD_TABLE is the widget that takes a view reference; the
          // VIEW widget's configuration carries no view id in SDK 2.41.
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.mandateProduct.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.productsCoveredWidget.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.renewals,
      title: 'Renewals',
      icon: 'IconCalendarRepeat',
      position: 3,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        renewalBanner(L.widgets.renewalsBanner),
        {
          universalIdentifier: L.widgets.renewalsFields,
          title: 'Renewal terms',
          type: WidgetType.FIELDS,
          configuration: { configurationType: 'FIELDS' },
          heightBehavior: FIT,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.activity,
      title: 'Activity',
      icon: 'IconTimelineEvent',
      position: 4,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.activityTimeline,
          title: 'Activity',
          type: WidgetType.TIMELINE,
          configuration: { configurationType: 'TIMELINE' },
          heightBehavior: FILL,
        },
      ],
    },
  ],
});
