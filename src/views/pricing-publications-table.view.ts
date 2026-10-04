/** "Pricing Publications" — the publish log, newest first. */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const P = IDS.pricingPublication.fields;
const V = IDS.views.pricingPublicationsTable;

export default defineView({
  universalIdentifier: V.view,
  name: 'Pricing Publications · 价格发布',
  objectUniversalIdentifier: IDS.pricingPublication.object,
  type: ViewType.TABLE,
  icon: 'IconCloudUpload',
  position: 0,
  fields: columns(V.fields, [
    [P.name, 260],
    [P.publishedAt, 180],
    [P.version, 140],
    [P.isLive, 100],
    [P.commitSha, 280],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: P.publishedAt,
      direction: ViewSortDirection.DESC,
    },
  ],
});
