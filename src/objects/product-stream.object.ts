/**
 * Product Stream — one Integra product line (Battery — Li-ion, Textiles, …).
 * The stream is the hub its regulatory updates, documents and contacts hang
 * off. The nine streams are records, not schema: ops/seed-product-streams.mjs
 * creates them from shared/streams.mjs (one per PRODUCT_CATEGORY value).
 *
 * `activeUpdateCount` and `lastUpdateAt` are denormalised for the Streams
 * table — a view cannot aggregate across a relation. Nothing writes them yet;
 * the stream rollup lands with the B2 stream workspace.
 */
import { defineObject } from '../lib/sdk';
import { boolean, dateTime, number, oneToMany, richText, text, uniqueText } from '../lib/fields';
import { IDS } from '../ids';

const F = IDS.productStream.fields;

export default defineObject({
  universalIdentifier: IDS.productStream.object,
  nameSingular: 'productStream',
  namePlural: 'productStreams',
  labelSingular: 'Product Stream',
  labelPlural: 'Product Streams',
  description: 'Integra product line: regulatory updates, documents and contacts',
  icon: 'IconStack2',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconStack2',
    }),
    uniqueText({
      universalIdentifier: F.slug,
      name: 'slug',
      label: 'Slug',
      icon: 'IconLink',
      description: 'Stable key, e.g. battery-li-ion (shared/streams.mjs)',
    }),
    richText({
      universalIdentifier: F.description,
      name: 'description',
      label: 'Description · 描述',
      icon: 'IconFileText',
    }),
    text({
      universalIdentifier: F.icon,
      name: 'icon',
      label: 'Icon · 图标',
      icon: 'IconMoodSmile',
      description: 'Emoji or short text',
    }),
    number({
      universalIdentifier: F.sortOrder,
      name: 'sortOrder',
      label: 'Sort order · 排序',
      icon: 'IconSortAscendingNumbers',
    }),
    boolean({
      universalIdentifier: F.isActive,
      name: 'isActive',
      label: 'Active · 启用',
      icon: 'IconToggleRight',
      defaultValue: true,
    }),
    number({
      universalIdentifier: F.activeUpdateCount,
      name: 'activeUpdateCount',
      label: 'Active updates · 有效更新',
      icon: 'IconNews',
      description: 'Denormalised count of this stream’s updates (not yet computed)',
    }),
    dateTime({
      universalIdentifier: F.lastUpdateAt,
      name: 'lastUpdateAt',
      label: 'Last update · 最近更新',
      icon: 'IconClock',
      description: 'Denormalised latest update publishedAt (not yet computed)',
    }),
    oneToMany({
      universalIdentifier: F.updates,
      name: 'updates',
      label: 'Updates · 更新',
      icon: 'IconNews',
      targetObjectId: IDS.streamUpdate.object,
      inverseFieldId: IDS.streamUpdate.fields.stream,
    }),
    oneToMany({
      universalIdentifier: F.documents,
      name: 'documents',
      label: 'Documents · 文件',
      icon: 'IconFolder',
      targetObjectId: IDS.streamDocument.object,
      inverseFieldId: IDS.streamDocument.fields.stream,
    }),
    oneToMany({
      universalIdentifier: F.discoveredCompanies,
      name: 'discoveredCompanies',
      label: 'Recommended for · 推荐线索',
      icon: 'IconBuildingFactory2',
      targetObjectId: IDS.discoveredCompany.object,
      inverseFieldId: IDS.discoveredCompany.fields.recommendedStream,
    }),
    oneToMany({
      universalIdentifier: F.contacts,
      name: 'contacts',
      label: 'Contacts · 联系人',
      icon: 'IconAddressBook',
      targetObjectId: IDS.streamContact.object,
      inverseFieldId: IDS.streamContact.fields.stream,
    }),
    oneToMany({
      universalIdentifier: F.competitors,
      name: 'competitors',
      label: 'Competitors · 竞争对手',
      icon: 'IconSwords',
      targetObjectId: IDS.competitor.object,
      inverseFieldId: IDS.competitor.fields.competitorOf,
    }),
  ],
});
