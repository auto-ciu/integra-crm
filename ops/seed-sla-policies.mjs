#!/usr/bin/env node
/**
 * Create the four default SlaPolicy records listed in shared/sla.mjs (E3):
 * URGENT 1h/8h, HIGH 4h/24h, NORMAL 8h/48h, LOW 24h/96h (first response /
 * resolution).
 *
 *   node ops/seed-sla-policies.mjs [--dry-run]
 *
 * Idempotent, keyed by `name`: policies that already exist are left exactly as
 * they are (staff own the numbers once seeded), missing ones are created.
 */
import { DEFAULT_SLA_POLICIES } from '../shared/sla.mjs';
import { TwentyApiError, configFromEnv, createRecord, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

async function main() {
  const dryRun = parseArgs(process.argv.slice(2))['dry-run'] === true;
  const config = configFromEnv();

  const existing = new Set((await findAllRecords(config, 'slaPolicies')).map((p) => p.name));
  const missing = DEFAULT_SLA_POLICIES.filter((p) => !existing.has(p.name));
  if (missing.length === 0) {
    console.log(`all ${DEFAULT_SLA_POLICIES.length} SLA policies exist — nothing to do`);
    return;
  }

  for (const p of missing) {
    console.log(`${dryRun ? '[dry-run] ' : ''}create ${p.name} (${p.firstResponseHours}h / ${p.resolutionHours}h)`);
    if (dryRun) continue;
    await createRecord(config, 'slaPolicies', { ...p });
  }
  console.log(`${dryRun ? 'would create' : 'created'} ${missing.length}, kept ${DEFAULT_SLA_POLICIES.length - missing.length}`);
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`seed-sla-policies: ${error.message}${detail}`);
  process.exit(1);
});
