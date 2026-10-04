/** "Stream Stages" — every pipeline stage, in order. */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const S = IDS.streamStage.fields;
const V = IDS.views.streamStagesTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Stream Stages · 阶段',
  objectUniversalIdentifier: IDS.streamStage.object,
  type: ViewType.TABLE,
  icon: 'IconListNumbers',
  position: 0,
  fields: columns(V.fields, [
    [S.stageName, 240],
    [S.order, 100],
    [S.isDefault, 100],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: S.order,
      direction: ViewSortDirection.ASC,
    },
  ],
});
