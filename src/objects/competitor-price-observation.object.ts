/**
 * Competitor Price Observation (D1-D2) — one competitor price seen on a date,
 * compared against one of our Offerings. Created by
 * research-ingest.ts from findings.json. `name` is "<competitor> — <date>",
 * only there to give the record a readable label.
 */
import { defineObject } from '../lib/sdk';
import { date, link, manyToOne, number, richText, select, text } from '../lib/fields';
import { IDS } from '../ids';
import { PRICE_CURRENCY } from '../options';

const F = IDS.competitorPriceObservation.fields;

export default defineObject({
  universalIdentifier: IDS.competitorPriceObservation.object,
  nameSingular: 'competitorPriceObservation',
  namePlural: 'competitorPriceObservations',
  labelSingular: 'Competitor Price Observation',
  labelPlural: 'Competitor Price Observations',
  description: 'A competitor price seen on a date, against one of our offerings',
  icon: 'IconScale',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Observation · 观察',
      icon: 'IconScale',
    }),
    manyToOne({
      universalIdentifier: F.competitor,
      name: 'competitor',
      label: 'Competitor · 竞争对手',
      icon: 'IconSwords',
      targetObjectId: IDS.competitor.object,
      inverseFieldId: IDS.competitor.fields.priceObservations,
    }),
    manyToOne({
      universalIdentifier: F.offering,
      name: 'offering',
      label: 'Our offering · 我方产品',
      icon: 'IconCurrencyEuro',
      targetObjectId: IDS.offering.object,
      inverseFieldId: IDS.offering.fields.competitorObservations,
    }),
    number({
      universalIdentifier: F.competitorPriceEur,
      name: 'competitorPriceEur',
      label: 'Competitor price (EUR) · 竞品价格',
      icon: 'IconCurrencyEuro',
      decimals: 2,
    }),
    select({
      universalIdentifier: F.currencyCode,
      name: 'currencyCode',
      label: 'Currency · 币种',
      icon: 'IconCoin',
      options: PRICE_CURRENCY,
      defaultValue: 'EUR',
    }),
    date({
      universalIdentifier: F.observedAt,
      name: 'observedAt',
      label: 'Observed at · 观察日期',
      icon: 'IconCalendar',
    }),
    link({
      universalIdentifier: F.sourceUrl,
      name: 'sourceUrl',
      label: 'Source · 来源',
      icon: 'IconWorldWww',
    }),
    richText({
      universalIdentifier: F.notes,
      name: 'notes',
      label: 'Notes · 备注',
      icon: 'IconNotes',
    }),
  ],
});
