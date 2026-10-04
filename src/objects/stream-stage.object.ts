/**
 * Stream Stage (B2) — one step of a product stream's sales pipeline
 * (Awareness → Interest → Evaluation → Negotiation → Closed Won). Each stream
 * owns its stages; ops/seed-stream-stages.mjs creates the standard five.
 * OpportunityLine.stage points here.
 */
import { defineObject } from '../lib/sdk';
import { boolean, manyToOne, number, oneToMany, text } from '../lib/fields';
import { IDS } from '../ids';

const F = IDS.streamStage.fields;

export default defineObject({
  universalIdentifier: IDS.streamStage.object,
  nameSingular: 'streamStage',
  namePlural: 'streamStages',
  labelSingular: 'Stream Stage',
  labelPlural: 'Stream Stages',
  description: 'One step of a product stream’s sales pipeline',
  icon: 'IconListNumbers',
  labelIdentifierFieldMetadataUniversalIdentifier: F.name,
  fields: [
    text({
      universalIdentifier: F.name,
      name: 'name',
      label: 'Name · 名称',
      icon: 'IconListNumbers',
      description: 'Display name, e.g. "Battery — Li-ion · Evaluation"',
    }),
    manyToOne({
      universalIdentifier: F.stream,
      name: 'stream',
      label: 'Stream · 产品线',
      icon: 'IconStack2',
      targetObjectId: IDS.productStream.object,
      inverseFieldId: IDS.productStream.fields.stages,
    }),
    text({
      universalIdentifier: F.stageName,
      name: 'stageName',
      label: 'Stage · 阶段',
      icon: 'IconFlag',
      description: 'Awareness, Interest, Evaluation, Negotiation, Closed Won',
    }),
    number({
      universalIdentifier: F.order,
      name: 'order',
      label: 'Order · 顺序',
      icon: 'IconSortAscendingNumbers',
      description: 'Position in the stream’s pipeline, 1 first',
    }),
    boolean({
      universalIdentifier: F.isDefault,
      name: 'isDefault',
      label: 'Default · 默认',
      icon: 'IconCheck',
      description: 'One of the standard stages seeded for every stream',
    }),
    text({
      universalIdentifier: F.description,
      name: 'description',
      label: 'Description · 描述',
      icon: 'IconFileText',
    }),
    oneToMany({
      universalIdentifier: F.opportunityLines,
      name: 'opportunityLines',
      label: 'Opportunity lines · 商机明细',
      icon: 'IconListDetails',
      targetObjectId: IDS.opportunityLine.object,
      inverseFieldId: IDS.opportunityLine.fields.stage,
    }),
  ],
});
