/**
 * Competitor (D1-D2) — a company competing in a product stream, upserted by
 * research-ingest.ts from findings.json (matched on name).
 */
import { defineObject } from '../lib/sdk';
import { dateTime, link, manyToOne, oneToMany, richText, text } from '../lib/fields';
import { IDS } from '../ids';

const F = IDS.competitor.fields;

export default defineObject({
  universalIdentifier: IDS.competitor.object,
  nameSingular: 'competitor',
  namePlural: 'competitors',
  labelSingular: 'Competitor',
  labelPlural: 'Competitors',
  description: 'A competitor tracked by market research',
  icon: 'IconSwords',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconSwords',
    }),
    link({
      universalIdentifier: F.website,
      name: 'website',
      label: 'Website · 网站',
      icon: 'IconWorldWww',
    }),
    manyToOne({
      universalIdentifier: F.competitorOf,
      name: 'competitorOf',
      label: 'Competitor of · 竞争的产品线',
      icon: 'IconStack2',
      targetObjectId: IDS.productStream.object,
      inverseFieldId: IDS.productStream.fields.competitors,
    }),
    richText({
      universalIdentifier: F.description,
      name: 'description',
      label: 'Description · 简介',
      icon: 'IconFileText',
    }),
    dateTime({
      universalIdentifier: F.lastObservationAt,
      name: 'lastObservationAt',
      label: 'Last observation · 最近观察',
      icon: 'IconEye',
    }),
    oneToMany({
      universalIdentifier: F.priceObservations,
      name: 'priceObservations',
      label: 'Price observations · 价格观察',
      icon: 'IconScale',
      targetObjectId: IDS.competitorPriceObservation.object,
      inverseFieldId: IDS.competitorPriceObservation.fields.competitor,
    }),
  ],
});
