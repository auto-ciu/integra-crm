/**
 * "Updates" — table widget of Stream Updates, newest first, embedded in the
 * Product Stream record page (with stream-documents / stream-contacts beside
 * it). As with the Enquiry "Messages" table, the record-page host is
 * expected to scope the relation-bound table to the current stream.
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const U = IDS.streamUpdate.fields;
const V = IDS.views.streamUpdatesWidget;

export default defineView({
  universalIdentifier: V.view,
  name: 'Updates · 更新',
  objectUniversalIdentifier: IDS.streamUpdate.object,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconNews',
  position: 0,
  fields: columns(V.fields, [
    [U.publishedAt, 150],
    [U.updateType, 160],
    [U.name, 320],
    [U.sourceUrl, 200],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: U.publishedAt,
      direction: ViewSortDirection.DESC,
    },
  ],
});
