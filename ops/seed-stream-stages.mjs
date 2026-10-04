#!/usr/bin/env node
/**
 * Create the standard five StreamStages for every ProductStream (B2).
 *
 *   node ops/seed-stream-stages.mjs [--dry-run]
 *
 * Idempotent, keyed by (stream, stageName): stages that exist are left exactly
 * as they are, missing ones are created. A second run creates nothing.
 */
import { STANDARD_STAGES } from '../shared/stream-kpis.mjs';
import { TwentyApiError, configFromEnv, createRecord, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

async function main() {
  const dryRun = parseArgs(process.argv.slice(2))['dry-run'] === true;
  const config = configFromEnv();

  const streams = await findAllRecords(config, 'productStreams');
  const existing = new Set((await findAllRecords(config, 'streamStages')).map((s) => `${s.streamId}|${s.stageName}`));

  let created = 0;
  let kept = 0;
  for (const stream of streams) {
    for (const stage of STANDARD_STAGES) {
      if (existing.has(`${stream.id}|${stage.stageName}`)) {
        kept += 1;
        continue;
      }
      console.log(`${dryRun ? '[dry-run] ' : ''}create ${stream.slug} · ${stage.order} ${stage.stageName}`);
      created += 1;
      if (dryRun) continue;
      await createRecord(config, 'streamStages', {
        name: `${stream.name} · ${stage.stageName}`,
        streamId: stream.id,
        stageName: stage.stageName,
        order: stage.order,
        isDefault: true,
      });
    }
  }
  console.log(
    created === 0
      ? `all ${streams.length} streams have their ${STANDARD_STAGES.length} stages — nothing to do`
      : `${dryRun ? 'would create' : 'created'} ${created}, kept ${kept}`,
  );
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`seed-stream-stages: ${error.message}${detail}`);
  process.exit(1);
});
