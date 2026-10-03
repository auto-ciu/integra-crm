/**
 * The ONLY file that imports from `twenty-sdk/define`.
 *
 * Everything else goes through this barrel so that, if the SDK's export
 * names differ from the ones assumed here, there is exactly one line to fix.
 * Export names are checked against twenty-sdk 2.41.0 by `npm run typecheck`.
 *
 * The SDK's manifest builder (`twenty dev` / `twenty dev:build`) does not
 * follow imports: it scans every .ts/.tsx file under the app and registers the
 * file's `export default defineX({...})` call — one entity per file, and the
 * default export must be the call itself, not an identifier. Re-exporting the
 * define* functions from here is fine; the builder matches on the name.
 */
export {
  defineApplication,
  defineApplicationRole,
  defineObject,
  defineField,
  defineView,
  definePageLayout,
  defineNavigationMenuItem,
  defineFrontComponent,
  defineLogicFunction,
  getFieldUniversalIdentifier,
  FieldType,
  RelationType,
  AggregateOperations,
  ViewType,
  ViewSortDirection,
  ViewFilterOperand,
  WidgetType,
  PageLayoutType,
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
  NavigationMenuItemType,
  HTTPMethod,
} from 'twenty-sdk/define';
export type {
  PageLayoutWidgetGridPosition,
  PageLayoutWidgetManifest,
} from 'twenty-sdk/define';
