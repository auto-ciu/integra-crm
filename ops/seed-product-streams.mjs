#!/usr/bin/env node
/**
 * Create the ProductStream records listed in shared/streams.mjs (B1).
 *
 *   node ops/seed-product-streams.mjs [--dry-run]
 *
 * Idempotent, keyed by `slug`: streams that already exist are left exactly as
 * they are (staff own the descriptions once seeded), missing ones are created.
 */
import { PRODUCT_STREAMS } from '../shared/streams.mjs';
import { TwentyApiError, configFromEnv, createRecord, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

async function main() {
  const dryRun = parseArgs(process.argv.slice(2))['dry-run'] === true;
  const config = configFromEnv();

  const existing = new Set((await findAllRecords(config, 'productStreams')).map((s) => s.slug));
  const missing = PRODUCT_STREAMS.filter((s) => !existing.has(s.slug));
  if (missing.length === 0) {
    console.log(`all ${PRODUCT_STREAMS.length} product streams exist — nothing to do`);
    return;
  }

  for (const s of missing) {
    console.log(`${dryRun ? '[dry-run] ' : ''}create ${s.slug} (${s.name})`);
    if (dryRun) continue;
    await createRecord(config, 'productStreams', {
      name: s.name,
      slug: s.slug,
      icon: s.icon,
      sortOrder: s.sortOrder,
      isActive: true,
      description: { markdown: s.description, blocknote: null },
    });
  }
  console.log(`${dryRun ? 'would create' : 'created'} ${missing.length}, kept ${PRODUCT_STREAMS.length - missing.length}`);
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`seed-product-streams: ${error.message}${detail}`);
  process.exit(1);
});
