/**
 * F0.3 spike — cron trigger. Logs once a day at 06:00 UTC.
 *
 * On a running server this answers F0.3 (b): the worker runs with
 * DISABLE_CRON_JOBS_REGISTRATION=true, so the job may never fire until cron
 * registration is enabled (or `cron:register:all` is run). If it does fire,
 * the F0.3 exit test is to port ops/nightly-status.mjs to this shape.
 */
import type { CronPayload } from 'twenty-sdk/logic-function';

import { defineLogicFunction } from '../lib/sdk';
import { IDS } from '../ids';

const handler = async (_payload: CronPayload) => {
  console.log('[daily-heartbeat]', new Date().toISOString());
  return { ok: true };
};

export default defineLogicFunction({
  universalIdentifier: IDS.logicFunctions.dailyHeartbeat,
  name: 'daily-heartbeat',
  description: 'Daily no-op that proves cron triggers fire (F0.3 spike)',
  timeoutSeconds: 5,
  handler,
  cronTriggerSettings: {
    pattern: '0 6 * * *',
  },
});
