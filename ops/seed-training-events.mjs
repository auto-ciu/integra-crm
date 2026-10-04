#!/usr/bin/env node
/**
 * Create the sample TrainingEvent records listed in shared/training.mjs (X5).
 *
 *   node ops/seed-training-events.mjs [--dry-run]
 *
 * Idempotent, keyed by `name`: events that already exist are left exactly as
 * they are, missing ones are created.
 */
import { TRAINING_EVENTS } from '../shared/training.mjs';
import { TwentyApiError, configFromEnv, createRecord, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

async function main() {
  const dryRun = parseArgs(process.argv.slice(2))['dry-run'] === true;
  const config = configFromEnv();

  const existing = new Set((await findAllRecords(config, 'trainingEvents')).map((e) => e.name));
  const missing = TRAINING_EVENTS.filter((e) => !existing.has(e.name));
  if (missing.length === 0) {
    console.log(`all ${TRAINING_EVENTS.length} training events exist — nothing to do`);
    return;
  }

  for (const e of missing) {
    console.log(`${dryRun ? '[dry-run] ' : ''}create ${e.name} (${e.date}, ${e.location}, ${e.language})`);
    if (dryRun) continue;
    await createRecord(config, 'trainingEvents', {
      name: e.name,
      date: e.date,
      channel: e.channel,
      location: e.location,
      language: e.language,
    });
  }
  console.log(`${dryRun ? 'would create' : 'created'} ${missing.length}, kept ${TRAINING_EVENTS.length - missing.length}`);
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`seed-training-events: ${error.message}${detail}`);
  process.exit(1);
});
