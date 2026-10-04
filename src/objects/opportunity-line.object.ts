/**
 * Opportunity Line (B2) — one product stream's slice of an Opportunity: what
 * is being sold (offering), how far along (stage), how much and how likely.
 * The stream KPI widget sums these per stream.
 *
 * `stage` should be one of the line's own stream's stages; a relation cannot
 * express that, so the stage picker is unfiltered in the schema and
 * verify-model / the seed keep stages per stream.
 */
import { defineObject } from '../lib/sdk';
import { boolean, date, manyToOne, number, richText, text } from '../lib/fields';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';

const F = IDS.opportunityLine.fields;

export default defineObject({
  universalIdentifier: IDS.opportunityLine.object,
  nameSingular: 'opportunityLine',
  namePlural: 'opportunityLines',
  labelSingular: 'Opportunity Line',
  labelPlural: 'Opportunity Lines',
  description: 'One product stream’s line on an opportunity: offering, stage, value, probability',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconListDetails',
    }),
    manyToOne({
      universalIdentifier: F.opportunity,
      name: 'opportunity',
      label: 'Opportunity · 商机',
      icon: 'IconTargetArrow',
      targetObjectId: STANDARD.opportunity.object,
      inverseFieldId: IDS.opportunity.fields.opportunityLines,
    }),
    manyToOne({
      universalIdentifier: F.stream,
      name: 'stream',
      label: 'Stream · 产品线',
      icon: 'IconStack2',
      targetObjectId: IDS.productStream.object,
      inverseFieldId: IDS.productStream.fields.opportunityLines,
    }),
    manyToOne({
      universalIdentifier: F.stage,
      name: 'stage',
      label: 'Stage · 阶段',
      icon: 'IconFlag',
      description: 'Should be one of the line’s stream’s stages',
      targetObjectId: IDS.streamStage.object,
      inverseFieldId: IDS.streamStage.fields.opportunityLines,
    }),
    manyToOne({
      universalIdentifier: F.offering,
      name: 'offering',
      label: 'Offering · 产品方案',
      icon: 'IconReceipt2',
      targetObjectId: IDS.offering.object,
      inverseFieldId: IDS.offering.fields.opportunityLines,
    }),
    number({
      universalIdentifier: F.estimatedValueEur,
      name: 'estimatedValueEur',
      label: 'Estimated value (EUR) · 预计金额',
      icon: 'IconCurrencyEuro',
      decimals: 2,
    }),
    number({
      universalIdentifier: F.probability,
      name: 'probability',
      label: 'Probability % · 概率',
      icon: 'IconPercentage',
      description: '0–100',
    }),
    date({
      universalIdentifier: F.expectedCloseDate,
      name: 'expectedCloseDate',
      label: 'Expected close · 预计成交',
      icon: 'IconCalendarEvent',
    }),
    richText({
      universalIdentifier: F.notes,
      name: 'notes',
      label: 'Notes · 备注',
      icon: 'IconNotes',
    }),
    boolean({
      universalIdentifier: F.isActive,
      name: 'isActive',
      label: 'Active · 启用',
      icon: 'IconToggleRight',
      defaultValue: true,
    }),
  ],
});
