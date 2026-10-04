/** "Bundle Items" — every bundle component, in sortOrder. */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const B = IDS.bundleItem.fields;
const V = IDS.views.bundleItemsTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Bundle Items · 组合内容',
  objectUniversalIdentifier: IDS.bundleItem.object,
  type: ViewType.TABLE,
  icon: 'IconPackages',
  position: 0,
  fields: columns(V.fields, [
    [B.name, 280],
    [B.bundle, 200],
    [B.component, 200],
    [B.included, 100],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: B.sortOrder,
      direction: ViewSortDirection.ASC,
    },
  ],
});
