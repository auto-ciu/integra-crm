/**
 * Pricing Publication (C1) — one run of ops/publish-pricing.mjs: when the
 * pricing.json was produced, which version, and from which commit. `isLive`
 * marks the latest publication; the publisher clears it on the previous one.
 */
import { defineObject } from '../lib/sdk';
import { boolean, dateTime, manyToOne, richText, text } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';

const F = IDS.pricingPublication.fields;

export default defineObject({
  universalIdentifier: IDS.pricingPublication.object,
  nameSingular: 'pricingPublication',
  namePlural: 'pricingPublications',
  labelSingular: 'Pricing Publication',
  labelPlural: 'Pricing Publications',
  description: 'A published pricing.json: when, which version, which commit',
  icon: 'IconCloudUpload',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconCloudUpload',
    }),
    dateTime({
      universalIdentifier: F.publishedAt,
      name: 'publishedAt',
      label: 'Published at · 发布时间',
      icon: 'IconCalendarEvent',
    }),
    text({
      universalIdentifier: F.version,
      name: 'version',
      label: 'Version · 版本',
      icon: 'IconTag',
    }),
    manyToOne({
      universalIdentifier: F.publishedBy,
      name: 'publishedBy',
      label: 'Published by · 发布人',
      icon: 'IconUserCircle',
      targetObjectId: STANDARD.workspaceMember.object,
      inverseFieldId: IDS.workspaceMember.fields.pricingPublications,
    }),
    text({
      universalIdentifier: F.commitSha,
      name: 'commitSha',
      label: 'Commit SHA · 提交',
      icon: 'IconGitCommit',
    }),
    boolean({
      universalIdentifier: F.isLive,
      name: 'isLive',
      label: 'Live · 当前',
      icon: 'IconBroadcast',
      description: 'The latest publication',
    }),
    richText({
      universalIdentifier: F.notes,
      name: 'notes',
      label: 'Notes · 备注',
      icon: 'IconNotes',
    }),
  ],
});
