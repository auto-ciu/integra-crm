#!/usr/bin/env node
/**
 * Create the TicketMacro records listed in shared/ticket-macros.mjs (E3):
 * Acknowledge receipt, Canton Fair follow-up, Request more info and Schedule
 * call, each in EN and ZH.
 *
 *   node ops/seed-ticket-macros.mjs [--dry-run]
 *
 * Idempotent, keyed by `name`: macros that already exist are left exactly as
 * they are (staff own the wording once seeded), missing ones are created.
 */
import { TICKET_MACROS } from '../shared/ticket-macros.mjs';
import { TwentyApiError, configFromEnv, createRecord, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

async function main() {
  const dryRun = parseArgs(process.argv.slice(2))['dry-run'] === true;
  const config = configFromEnv();

  const existing = new Set((await findAllRecords(config, 'ticketMacros')).map((m) => m.name));
  const missing = TICKET_MACROS.filter((m) => !existing.has(m.name));
  if (missing.length === 0) {
    console.log(`all ${TICKET_MACROS.length} ticket macros exist — nothing to do`);
    return;
  }

  for (const m of missing) {
    console.log(`${dryRun ? '[dry-run] ' : ''}create ${m.name} (${m.shortcut})`);
    if (dryRun) continue;
    await createRecord(config, 'ticketMacros', {
      name: m.name,
      shortcut: m.shortcut,
      responseTemplate: { markdown: m.responseTemplate, blocknote: null },
      category: m.category,
      appendSignature: m.appendSignature,
      ...(m.productCategory ? { productCategory: m.productCategory } : {}),
      ...(m.serviceInterest ? { serviceInterest: m.serviceInterest } : {}),
    });
  }
  console.log(`${dryRun ? 'would create' : 'created'} ${missing.length}, kept ${TICKET_MACROS.length - missing.length}`);
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`seed-ticket-macros: ${error.message}${detail}`);
  process.exit(1);
});
