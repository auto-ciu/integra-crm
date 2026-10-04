#!/usr/bin/env node
/**
 * Mark a StreamUpdate as published on the public website (B3).
 *
 *   node ops/publish-stream-content.mjs --update=<streamUpdateId> --url=<https://…integrascientific.com/…> [--dry-run]
 *
 * Sets isPublished=true and publishUrl. The URL must be https on
 * integrascientific.com (or a subdomain); anything else is refused before any
 * API call. Idempotent: when the update is already published with that URL
 * nothing is written, so running it twice gives the same result.
 */
import { integraUrl } from '../shared/stream-content.mjs';
import { TwentyApiError, configFromEnv, eq, findRecords, parseArgs, updateRecord } from './lib/twenty-api.mjs';

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const dryRun = flags['dry-run'] === true;
  const id = typeof flags.update === 'string' ? flags.update : '';
  if (!id || typeof flags.url !== 'string') {
    throw new Error('usage: publish-stream-content --update=<streamUpdateId> --url=<https://www.integrascientific.com/…> [--dry-run]');
  }
  const url = integraUrl(flags.url);
  if (!url) throw new Error(`refusing ${flags.url}: the URL must be https on integrascientific.com`);

  const config = configFromEnv();
  const [update] = await findRecords(config, 'streamUpdates', { filter: eq('id', id), limit: 1 });
  if (!update) throw new Error(`no StreamUpdate with id ${id}`);

  if (update.isPublished === true && update.publishUrl?.primaryLinkUrl === url) {
    console.log(`already published: ${update.name ?? id} → ${url}`);
    return;
  }
  console.log(`${dryRun ? '[dry-run] ' : ''}publish ${update.name ?? id} → ${url}`);
  if (dryRun) return;
  await updateRecord(config, 'streamUpdates', id, {
    isPublished: true,
    publishUrl: { primaryLinkUrl: url, primaryLinkLabel: '', secondaryLinks: null },
  });
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`publish-stream-content: ${error.message}${detail}`);
  process.exit(1);
});
