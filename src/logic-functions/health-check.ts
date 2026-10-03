/**
 * F0.3 spike — httpRoute trigger.
 *
 *   GET {TWENTY_FUNCTIONS_URL or <server>/s}/health → { ok, version, timestamp }
 *
 * Public on purpose (isAuthRequired: false): it is a liveness probe and returns
 * nothing about the workspace. Exercising it on a running server answers F0.3
 * (a) and (f): does the route resolve, and is a logic-function driver enabled
 * (self-hosted production defaults to LOGIC_FUNCTION_TYPE=DISABLED).
 */
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { defineLogicFunction, HTTPMethod } from '../lib/sdk';
import { IDS } from '../ids';

/** The Twenty line this app is pinned to (package.json ~2.41.0). */
const TWENTY_VERSION = '2.41.0';

const handler = async (_event: RoutePayload) => ({
  ok: true,
  version: TWENTY_VERSION,
  timestamp: new Date().toISOString(),
});

export default defineLogicFunction({
  universalIdentifier: IDS.logicFunctions.healthCheck,
  name: 'health-check',
  description: 'Liveness probe for the logic-function runtime (F0.3 spike)',
  timeoutSeconds: 5,
  handler,
  httpRouteTriggerSettings: {
    path: '/health',
    httpMethod: HTTPMethod.GET,
    isAuthRequired: false,
  },
});
