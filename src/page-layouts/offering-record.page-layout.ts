/**
 * Offering record page: Overview / Price Points / Bundle Items.
 *
 * Overview leads with the PricingDisplay preview (how the website will show
 * this offering, via the same transform as ops/publish-pricing.mjs), then a
 * FIELDS widget (views/offering-overview-fields.view.ts). Price Points and
 * Bundle Items are RECORD_TABLE widgets backed by TABLE_WIDGET views
 * (views/offering-price-points.view.ts, views/offering-bundle-items.view.ts).
 */
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from '../lib/sdk';
import { IDS } from '../ids';

const L = IDS.pageLayouts.offeringRecord;

const FIT = PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT;
const FILL = PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT;

export default definePageLayout({
  universalIdentifier: L.layout,
  name: 'Offering',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: IDS.offering.object,
  tabs: [
    {
      universalIdentifier: L.tabs.overview,
      title: 'Overview',
      icon: 'IconReceipt2',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.pricingPreview,
          title: 'Public display preview',
          type: WidgetType.FRONT_COMPONENT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: IDS.frontComponents.pricingDisplay,
          },
          heightBehavior: FIT,
        },
        {
          universalIdentifier: L.widgets.overviewFields,
          title: 'Overview',
          type: WidgetType.FIELDS,
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: IDS.views.offeringOverviewFields.view,
          },
          heightBehavior: FIT,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.pricePoints,
      title: 'Price Points',
      icon: 'IconCurrencyEuro',
      position: 1,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.pricePoints,
          title: 'Price Points',
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.pricePoint.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.offeringPricePointsWidget.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.bundleItems,
      title: 'Bundle Items',
      icon: 'IconPackages',
      position: 2,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.bundleItems,
          title: 'Bundle Items',
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.bundleItem.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.offeringBundleItemsWidget.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
  ],
});
