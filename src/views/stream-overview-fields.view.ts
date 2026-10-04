/** Fields widget for the Product Stream record page's Overview tab. */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const S = IDS.productStream.fields;
const V = IDS.views.streamOverviewFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Overview · 概览',
  objectUniversalIdentifier: IDS.productStream.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconStack2',
  position: 0,
  fields: columns(V.fields, [
    [S.name, 0],
    [S.description, 0],
    [S.icon, 0],
    [S.isActive, 0],
  ]),
});
