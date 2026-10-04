/** "Documents" — table widget of Stream Documents on the Product Stream record page, newest first. */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const D = IDS.streamDocument.fields;
const V = IDS.views.streamDocumentsWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Documents · 文件',
  objectUniversalIdentifier: IDS.streamDocument.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconFolder',
  position: 0,
  fields: columns(V.fields, [
    [D.name, 280],
    [D.documentType, 150],
    [D.version, 100],
    [D.effectiveDate, 140],
    [D.file, 180],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: D.effectiveDate,
      direction: ViewSortDirection.DESC,
    },
  ],
});
