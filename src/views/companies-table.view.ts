/**
 * Companies table — ≤ 8 columns, the Integra fields first after the name so
 * a Chinese-speaking account manager sees 中文名 / 省份 / 类别 / 层级 without
 * scrolling.
 */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';

const V = IDS.views.companiesTable;

const columns: Array<[fieldId: string, size: number]> = [
  [STANDARD.company.fields.name, 210],
  [IDS.company.fields.nameZh, 160],
  [IDS.company.fields.province, 120],
  [IDS.company.fields.productCategory, 170],
  [IDS.company.fields.tier, 100],
  [IDS.company.fields.wechatId, 140],
  [IDS.company.fields.exportRevenueBand, 140],
  [STANDARD.company.fields.domainName, 160],
];

export default defineView({
  universalIdentifier: V.view,
  name: 'Companies · 公司',
  objectUniversalIdentifier: STANDARD.company.object,
  type: ViewType.TABLE,
  icon: 'IconBuildingSkyscraper',
  position: 0,
  fields: columns.map(([fieldMetadataUniversalIdentifier, size], position) => ({
    universalIdentifier: V.fields[position],
    fieldMetadataUniversalIdentifier,
    position,
    size,
    isVisible: true,
  })),
});
