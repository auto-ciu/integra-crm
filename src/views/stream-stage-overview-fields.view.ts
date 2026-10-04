/** Fields widget for the Stream Stage record page's Overview tab. */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const S = IDS.streamStage.fields;
const V = IDS.views.streamStageOverviewFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Overview · 概览',
  objectUniversalIdentifier: IDS.streamStage.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconListNumbers',
  position: 0,
  fields: columns(V.fields, [
    [S.name, 0],
    [S.stream, 0],
    [S.stageName, 0],
    [S.order, 0],
    [S.isDefault, 0],
    [S.description, 0],
  ]),
});
