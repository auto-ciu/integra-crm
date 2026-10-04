#!/usr/bin/env node
/**
 * Create the ReplyTemplate records listed in shared/reply-templates.mjs (E2):
 * DPP, AR, Training, Authorities and the catch-all, each in EN and ZH.
 *
 *   node ops/seed-reply-templates.mjs [--dry-run]
 *
 * Idempotent, keyed by `name`: templates that already exist are left exactly
 * as they are (staff own the wording once seeded), missing ones are created.
 */
import { REPLY_TEMPLATES } from '../shared/reply-templates.mjs';
import { TwentyApiError, configFromEnv, createRecord, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

async function main() {
  const dryRun = parseArgs(process.argv.slice(2))['dry-run'] === true;
  const config = configFromEnv();

  const existing = new Set((await findAllRecords(config, 'replyTemplates')).map((t) => t.name));
  const missing = REPLY_TEMPLATES.filter((t) => !existing.has(t.name));
  if (missing.length === 0) {
    console.log(`all ${REPLY_TEMPLATES.length} reply templates exist — nothing to do`);
    return;
  }

  for (const t of missing) {
    console.log(`${dryRun ? '[dry-run] ' : ''}create ${t.name} (${t.category}/${t.language})`);
    if (dryRun) continue;
    await createRecord(config, 'replyTemplates', {
      name: t.name,
      category: t.category,
      language: t.language,
      subject: t.subject,
      body: { markdown: t.body, blocknote: null },
      isActive: t.isActive,
      sortOrder: t.sortOrder,
    });
  }
  console.log(`${dryRun ? 'would create' : 'created'} ${missing.length}, kept ${REPLY_TEMPLATES.length - missing.length}`);
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`seed-reply-templates: ${error.message}${detail}`);
  process.exit(1);
});
