/** Fields widget for the Research Brief record page's Raw Result tab: Claude's answer only. */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const R = IDS.researchBrief.fields;
const V = IDS.views.researchBriefResultFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Raw Result · 原始结果',
  objectUniversalIdentifier: IDS.researchBrief.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconFileText',
  position: 0,
  fields: columns(V.fields, [[R.result, 0]]),
});
