#!/usr/bin/env node
/**
 * Nightly AR Mandate status job (no Twenty workflow credits).
 *
 * For every arMandate:
 *   urgency := NONE (>180d) | WATCH (90–180d) | DUE (<90d) | OVERDUE (<0d)
 *   status  := EXPIRING when status is ACTIVE and urgency is DUE/OVERDUE
 * and PATCHes only the records whose values actually change — so re-running
 * is a no-op (idempotent) and the audit log stays quiet.
 *
 *   node ops/nightly-status.mjs [--dry-run] [--today=YYYY-MM-DD]
 *
 * Exit codes: 0 ok · 1 API/config error (so a cron/CI runner notices).
 * Env: TWENTY_API_URL, TWENTY_API_KEY (see ops/lib/twenty-api.mjs).
 */
import { pathToFileURL } from 'node:url';

import {
  MANDATE_STATUS,
  URGENCY,
  daysUntil,
  nextStatus,
  urgencyForDays,
} from '../shared/urgency.mjs';
import {
  TwentyApiError,
  configFromEnv,
  findAllRecords,
  parseArgs,
  updateRecord,
} from './lib/twenty-api.mjs';

const OBJECT = 'arMandates';

/** Pure: what each record should become. Exported for testing/reuse. */
export function planUpdates(mandates, today = new Date()) {
  const plan = [];
  for (const m of mandates) {
    const days = daysUntil(m.renewalDate, today);
    const urgency = urgencyForDays(days);
    const currentUrgency = m.urgency ?? URGENCY.NONE;
    const currentStatus = m.status ?? MANDATE_STATUS.DRAFT;
    const status = nextStatus(currentStatus, urgency);
    const patch = {};
    if (urgency !== currentUrgency) patch.urgency = urgency;
    if (status !== currentStatus) patch.status = status;
    if (Object.keys(patch).length > 0) {
      plan.push({ id: m.id, name: m.name ?? m.id, days, from: { urgency: currentUrgency, status: currentStatus }, patch });
    }
  }
  return plan;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const dryRun = flags['dry-run'] === true;
  const today = flags.today ? new Date(`${flags.today}T00:00:00Z`) : new Date();
  if (Number.isNaN(today.getTime())) throw new TwentyApiError(`--today is not a date: ${flags.today}`);

  const config = configFromEnv();
  const mandates = await findAllRecords(config, OBJECT, { orderBy: 'renewalDate[AscNullsLast]' });
  const plan = planUpdates(mandates, today);

  console.log(
    `${dryRun ? '[dry-run] ' : ''}${mandates.length} mandate(s) scanned on ${today.toISOString().slice(0, 10)}; ${plan.length} to update`,
  );
  for (const item of plan) {
    const changes = Object.entries(item.patch)
      .map(([k, v]) => `${k}: ${item.from[k]} → ${v}`)
      .join(', ');
    console.log(`  ${item.name} (${item.days === null ? 'no renewal date' : `${item.days}d`}): ${changes}`);
  }

  if (dryRun) return;

  let updated = 0;
  for (const item of plan) {
    await updateRecord(config, OBJECT, item.id, item.patch);
    updated += 1;
  }
  console.log(`updated ${updated} record(s)`);
}

// Only run when executed directly (so planUpdates can be imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
    console.error(`nightly-status: ${error.message}${detail}`);
    process.exit(1);
  });
}
