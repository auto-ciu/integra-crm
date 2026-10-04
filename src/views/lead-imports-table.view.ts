/**
 * "Lead Imports" — every CSV/XLSX lead import batch (A2), newest first.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const L = IDS.leadImport.fields;
const V = IDS.views.leadImportsTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Lead Imports · 线索导入',
  objectUniversalIdentifier: IDS.leadImport.object,
  type: ViewType.TABLE,
  icon: 'IconFileImport',
  position: 0,
  fields: columns(V.fields, [
    [L.name, 240],
    [L.source, 110],
    [L.status, 120],
    [L.rowCount, 90],
    [L.importedCount, 110],
    [L.duplicateCount, 110],
    [L.startedAt, 150],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: L.startedAt,
      direction: ViewSortDirection.DESC,
    },
  ],
});
