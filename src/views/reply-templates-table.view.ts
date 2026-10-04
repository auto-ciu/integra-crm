/**
 * "Reply Templates" — every E2 auto-reply template, in sortOrder. No sidebar
 * item: reached from the object list (Settings → Data model) or search.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const R = IDS.replyTemplate.fields;
const V = IDS.views.replyTemplatesTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Reply Templates · 自动回复模板',
  objectUniversalIdentifier: IDS.replyTemplate.object,
  type: ViewType.TABLE,
  icon: 'IconMailForward',
  position: 0,
  fields: columns(V.fields, [
    [R.name, 240],
    [R.category, 180],
    [R.language, 120],
    [R.isActive, 100],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: R.sortOrder,
      direction: ViewSortDirection.ASC,
    },
  ],
});
