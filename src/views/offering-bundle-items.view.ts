/**
 * "Bundle Items" — table widget on the Offering record page (a BUNDLE
 * offering's components), in sortOrder. Scoped to the current offering by the
 * record-page host, like the Price Points widget.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const B = IDS.bundleItem.fields;
const V = IDS.views.offeringBundleItemsWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Bundle Items · 组合内容',
  objectUniversalIdentifier: IDS.bundleItem.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconPackages',
  position: 0,
  fields: columns(V.fields, [
    [B.name, 260],
    [B.component, 200],
    [B.included, 100],
    [B.sortOrder, 100],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: B.sortOrder,
      direction: ViewSortDirection.ASC,
    },
  ],
});
