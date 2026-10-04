/**
 * "Product Streams" — every stream in sortOrder, with how much is going on in
 * each (denormalised counts, see product-stream.object.ts).
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const S = IDS.productStream.fields;
const V = IDS.views.streamsList;

export default defineView({
  universalIdentifier: V.view,
  name: 'Product Streams · 产品线',
  objectUniversalIdentifier: IDS.productStream.object,
  type: ViewType.TABLE,
  icon: 'IconStack2',
  position: 0,
  fields: columns(V.fields, [
    [S.name, 200],
    [S.description, 360],
    [S.activeUpdateCount, 130],
    [S.lastUpdateAt, 160],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: S.sortOrder,
      direction: ViewSortDirection.ASC,
    },
  ],
});
