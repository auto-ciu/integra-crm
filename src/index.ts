/**
 * Integra Scientific CRM — Twenty App (Requirement 4).
 *
 * The flywheel data model, expressed as one App package on top of an
 * unmodified Twenty v2.41 (no fork, no vendoring):
 *
 *   Training (low-trust entry) → DPP platform (SaaS) → AR services (annual
 *   mandate) → regulatory-authority credibility.
 *
 * This file only declares the application. Every other definition lives in
 * its own file as `export default defineX({...})`; the SDK's manifest builder
 * finds them by scanning src/ (see lib/sdk.ts), so nothing is re-exported here.
 */
import { defineApplication, FieldType } from './lib/sdk';
import { IDS } from './ids';

export default defineApplication({
  universalIdentifier: IDS.app,
  displayName: 'Integra CRM',
  description:
    'Integra Scientific flywheel: Chinese battery manufacturers → EU compliance (DPP, AR mandates, training).',
  // Read by front components (getApplicationVariable), so neither is secret.
  applicationVariables: {
    SIDECAR_URL: {
      universalIdentifier: IDS.applicationVariables.sidecarUrl,
      label: 'Sidecar URL',
      description: 'API Gateway base URL of the CRM sidecar; RegisterForTrainingButton POSTs to <SIDECAR_URL>/register-for-training',
      type: FieldType.TEXT,
    },
    REGISTRATION_TOKEN: {
      universalIdentifier: IDS.applicationVariables.registrationToken,
      label: 'Registration token',
      description: 'Bearer for register-for-training only (never OPS_TOKEN): every CRM user\'s browser can read it',
      type: FieldType.TEXT,
    },
  },
});
