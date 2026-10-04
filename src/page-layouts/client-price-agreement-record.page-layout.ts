/**
 * Client Price Agreement record page: Overview / Lines / Validation.
 *
 * Overview is a FIELDS widget (views/client-price-agreement-overview-fields.view.ts).
 * Lines is a RECORD_TABLE widget backed by a TABLE_WIDGET view
 * (views/client-price-agreement-lines.view.ts). Validation holds the
 * ValidateDiscountsButton: a manual "Check discounts" that runs the
 * validate-agreement-discounts sidecar and shows each line over its Discount
 * Rule and who must approve it.
 */
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  PageLayoutWidgetVerticalListHeightBehavior,
  WidgetType,
} from '../lib/sdk';
import { IDS } from '../ids';

const L = IDS.pageLayouts.clientPriceAgreementRecord;

const FIT = PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT;
const FILL = PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT;

export default definePageLayout({
  universalIdentifier: L.layout,
  name: 'Client Price Agreement',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: IDS.clientPriceAgreement.object,
  tabs: [
    {
      universalIdentifier: L.tabs.overview,
      title: 'Overview',
      icon: 'IconFileDollar',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.overviewFields,
          title: 'Overview',
          type: WidgetType.FIELDS,
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier: IDS.views.clientPriceAgreementOverviewFields.view,
          },
          heightBehavior: FIT,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.lines,
      title: 'Lines',
      icon: 'IconListDetails',
      position: 1,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.lines,
          title: 'Agreement Lines',
          type: WidgetType.RECORD_TABLE,
          objectUniversalIdentifier: IDS.agreementLine.object,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: IDS.views.clientPriceAgreementLinesWidget.view,
          },
          heightBehavior: FILL,
        },
      ],
    },
    {
      universalIdentifier: L.tabs.validation,
      title: 'Validation',
      icon: 'IconShieldCheck',
      position: 2,
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: L.widgets.validateDiscounts,
          title: 'Discount compliance',
          type: WidgetType.FRONT_COMPONENT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: IDS.frontComponents.validateDiscountsButton,
          },
          heightBehavior: FIT,
        },
      ],
    },
  ],
});
