/**
 * F0.3 spike — databaseEvent trigger. Logs every new Company.
 *
 * Event names are `<objectNameSingular>.<action>` (created, updated, deleted,
 * destroyed, restored, upserted). On a running server this answers F0.3 (c):
 * does the event fire, and does the payload carry the acting member
 * (`workspaceMemberId`)? `updatedFields` filtering only applies to `.updated`.
 */
import type { DatabaseEventPayload, ObjectRecordCreateEvent } from 'twenty-sdk/logic-function';

import { defineLogicFunction } from '../lib/sdk';
import { IDS } from '../ids';

type CompanySnapshot = { id: string; name?: string | null };

const handler = async (event: DatabaseEventPayload<ObjectRecordCreateEvent<CompanySnapshot>>) => {
  console.log('[company-created]', {
    event: event.name,
    recordId: event.recordId,
    name: event.properties.after?.name ?? null,
    workspaceMemberId: event.workspaceMemberId ?? null,
  });
  return { logged: true };
};

export default defineLogicFunction({
  universalIdentifier: IDS.logicFunctions.companyCreated,
  name: 'company-created',
  description: 'Logs Company creation (F0.3 databaseEvent spike)',
  timeoutSeconds: 5,
  handler,
  databaseEventTriggerSettings: {
    eventName: 'company.created',
  },
});
