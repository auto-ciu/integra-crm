/**
 * The application's default role — what the app's own token runs as.
 *
 * Read-only on purpose: the front components only read AR Mandates, and the
 * ops scripts (ops/*.mjs) authenticate with their own API key. Widen this when
 * an app-side feature actually needs to write.
 */
import { defineApplicationRole } from './lib/sdk';
import { IDS } from './ids';

export default defineApplicationRole({
  universalIdentifier: IDS.appRole,
  label: 'Integra CRM app',
  description: 'Default role of the Integra CRM app: read all records, no writes',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
});
