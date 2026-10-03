/**
 * Fair leads kanban — People grouped by `leadStatus` (New / Qualified /
 * Discard). Requirement 6 (Canton Fair intake) creates the People; this view
 * costs one select field and exists so the intake has somewhere to land.
 */
import { defineView, ViewType } from '../lib/sdk';
import { IDS } from '../ids';
import { STANDARD } from '../standard-ids';
import { LEAD_STATUS } from '../options';

const V = IDS.views.fairLeadsKanban;

export default defineView({
  universalIdentifier: V.view,
  name: 'Fair leads · 展会线索',
  objectUniversalIdentifier: STANDARD.person.object,
  type: ViewType.KANBAN,
  icon: 'IconTicket',
  position: 1,
  mainGroupByFieldMetadataUniversalIdentifier: IDS.person.fields.leadStatus,
  shouldHideEmptyGroups: false,
  groups: LEAD_STATUS.map((status) => ({
    universalIdentifier: V.groups[status.position],
    fieldValue: status.value,
    position: status.position,
    isVisible: true,
  })),
  fields: (
    [
      [STANDARD.person.fields.name, 180],
      [STANDARD.person.fields.company, 160],
      [IDS.person.fields.wechatId, 140],
    ] as Array<[string, number]>
  ).map(([fieldMetadataUniversalIdentifier, size], position) => ({
    universalIdentifier: V.fields[position],
    fieldMetadataUniversalIdentifier,
    position,
    size,
    isVisible: true,
  })),
});
