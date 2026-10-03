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
import { defineApplication } from './lib/sdk';
import { IDS } from './ids';

export default defineApplication({
  universalIdentifier: IDS.app,
  displayName: 'Integra CRM',
  description:
    'Integra Scientific flywheel: Chinese battery manufacturers → EU compliance (DPP, AR mandates, training).',
});
