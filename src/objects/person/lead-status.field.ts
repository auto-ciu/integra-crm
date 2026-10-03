/** Person.leadStatus — fair-lead triage column for the "Fair leads" kanban (Requirement 6 writes it). */
import { defineField } from '../../lib/sdk';
import { select } from '../../lib/fields';
import { IDS } from '../../ids';
import { STANDARD } from '../../standard-ids';
import { LEAD_STATUS } from '../../options';

export default defineField({
  objectUniversalIdentifier: STANDARD.person.object,
  ...select({
    universalIdentifier: IDS.person.fields.leadStatus,
    name: 'leadStatus',
    label: 'Lead status · 线索状态',
    icon: 'IconFlag',
    options: LEAD_STATUS,
    defaultValue: 'NEW',
  }),
});
