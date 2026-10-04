/**
 * Pricing Strategy record page: Overview / Price Items.
 *
 * Overview leads with the PricingDisplay preview (how the website will show
 * this strategy, via the same transform as ops/publish-pricing.mjs), then a
 * FIELDS widget (views/pricing-strategy-overview-fields.view.ts). Price Items
 * is a RECORD_TABLE widget (views/strategy-price-items.view.ts).
 */
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from '../lib/sdk';
import { IDS } from '../ids';

const L = IDS.pageLayouts.pricingStrategyRecord;

const FIT = PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT;
const FILL = PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT;

export default definePageLayout({
  universalIdentifier: L.layout,
  name: 'Pricing Strategy',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: IDS.pricingStrategy.object,
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
            viewUniversalIdentifier: IDS.views.pricingStrategyOverviewFields.view,
          },
          heightBehavior: FIT,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.priceItems,
      title: 'Price Items',
      icon: 'IconCurrencyEuro',
      position: 1,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.priceItems,
          title: 'Price Items',
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.priceItem.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.strategyPriceItemsWidget.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
  ],
});
