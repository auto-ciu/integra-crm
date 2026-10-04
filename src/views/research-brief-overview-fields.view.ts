/** Fields widget for the Research Brief record page's Overview tab: every field. */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const R = IDS.researchBrief.fields;
const V = IDS.views.researchBriefOverviewFields;

export default defineView({
  universalIdentifier: V.view,
  name: 'Overview · 概览',
  objectUniversalIdentifier: IDS.researchBrief.object,
  type: ViewType.FIELDS_WIDGET,
  icon: 'IconTelescope',
  position: 0,
  fields: columns(V.fields, [
    [R.title, 0],
    [R.topic, 0],
    [R.scope, 0],
    [R.depth, 0],
    [R.status, 0],
    [R.isVerified, 0],
    [R.costUsd, 0],
    [R.submittedAt, 0],
    [R.completedAt, 0],
    [R.prompt, 0],
    [R.result, 0],
    [R.resultJson, 0],
    [R.sourceUrls, 0],
  ]),
});
