/**
 * Stream Update — a dated item in a product stream's feed: a regulatory
 * change, new guidance, a deadline, an event or news.
 *
 * The kind is `updateType`, not `type`: Twenty reserves `type` as a field name.
 */
import { defineObject } from '../lib/sdk';
import { dateTime, link, manyToOne, richText, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { STREAM_UPDATE_TYPE } from '../options';

const F = IDS.streamUpdate.fields;

export default defineObject({
  universalIdentifier: IDS.streamUpdate.object,
  nameSingular: 'streamUpdate',
  namePlural: 'streamUpdates',
  labelSingular: 'Stream Update',
  labelPlural: 'Stream Updates',
  description: 'Regulatory update, guidance, deadline, event or news for a product stream',
  icon: 'IconNews',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    // Twenty's conventional `name` column (as TrainingEvent); shown as "Title".
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Title · 标题',
      icon: 'IconNews',
    }),
    manyToOne({
      universalIdentifier: F.stream,
      name: 'stream',
      label: 'Stream · 产品线',
      icon: 'IconStack2',
      targetObjectId: IDS.productStream.object,
      inverseFieldId: IDS.productStream.fields.updates,
    }),
    richText({
      universalIdentifier: F.body,
      name: 'body',
      label: 'Body · 内容',
      icon: 'IconFileText',
    }),
    select({
      universalIdentifier: F.updateType,
      name: 'updateType',
      label: 'Type · 类型',
      icon: 'IconCategory',
      options: STREAM_UPDATE_TYPE,
      defaultValue: 'REGULATORY_UPDATE',
    }),
    dateTime({
      universalIdentifier: F.publishedAt,
      name: 'publishedAt',
      label: 'Published at · 发布时间',
      icon: 'IconCalendar',
    }),
    link({
      universalIdentifier: F.sourceUrl,
      name: 'sourceUrl',
      label: 'Source · 来源',
      icon: 'IconWorldWww',
    }),
  ],
});
