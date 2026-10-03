/**
 * Pipeline kanban — Opportunities grouped by the standard `stage` field.
 *
 * Named "Pipeline" (English-only on purpose): the e2e journey's
 * `switchToKanbanView(/pipeline|by stage|kanban/i)` picks it from the view
 * menu. Columns come from shared/stages.mjs, the same list
 * ops/sync-opportunity-stages.mjs writes into the stage field's options.
 */
import { AggregateOperations, defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import { OPPORTUNITY_STAGES } from '../options';

const V = IDS.views.pipelineKanban;

const cardFields: Array<[fieldId: string, size: number]> = [
  [STANDARD.opportunity.fields.name, 180],
  [STANDARD.opportunity.fields.company, 150],
  [STANDARD.opportunity.fields.amount, 120],
  [IDS.opportunity.fields.productLine, 120],
];

export default defineView({
  universalIdentifier: V.view,
  name: 'Pipeline',
  objectUniversalIdentifier: STANDARD.opportunity.object,
  type: ViewType.KANBAN,
  icon: 'IconLayoutKanban',
  position: 0,
  mainGroupByFieldMetadataUniversalIdentifier: STANDARD.opportunity.fields.stage,
  kanbanAggregateOperationFieldMetadataUniversalIdentifier: STANDARD.opportunity.fields.amount,
  kanbanAggregateOperation: AggregateOperations.SUM,
  shouldHideEmptyGroups: false,
  groups: OPPORTUNITY_STAGES.map((stage) => ({
    universalIdentifier: V.groups[stage.position],
    fieldValue: stage.value,
    position: stage.position,
    isVisible: true,
  })),
  fields: cardFields.map(([fieldMetadataUniversalIdentifier, size], position) => ({
    universalIdentifier: V.fields[position],
    fieldMetadataUniversalIdentifier,
    position,
    size,
    isVisible: true,
  })),
});
