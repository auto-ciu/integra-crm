/**
 * "Stream Content Report" — every StreamUpdate with its content category and
 * publish state, newest first. Filter by Content category in the view bar.
 *
 * StreamUpdate is the content source: StreamDocument is not linked to an
 * update, so there is no document column, and Engagement is a placeholder
 * (engagement is not tracked yet).
 */
import { defineView, ViewSortDirection, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { columns } from './columns';

const U = IDS.streamUpdate.fields;
const V = IDS.views.streamContentReport;

export default defineView({
  universalIdentifier: V.view,
  name: 'Stream Content Report · 内容报告',
  objectUniversalIdentifier: IDS.streamUpdate.object,
  type: ViewType.TABLE,
  icon: 'IconReportAnalytics',
  position: 0,
  fields: columns(V.fields, [
    [U.name, 260],
    [U.stream, 160],
    [U.contentCategory, 150],
    [U.publishedAt, 160],
    [U.isPublished, 110],
    [U.engagementCount, 120],
  ]),
  sorts: [
    {
      universalIdentifier: V.sort,
      fieldMetadataUniversalIdentifier: U.publishedAt,
      direction: ViewSortDirection.DESC,
    },
  ],
});
