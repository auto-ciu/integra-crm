#!/usr/bin/env node
/**
 * Nightly AR Mandate status job (no Twenty workflow credits) — a thin CLI
 * over the renewals-check sidecar function, which owns the maths and the
 * writes (src/functions/renewals-check.ts, shared/urgency.mjs):
 *
 *   urgency := NONE (>180d) | WATCH (90–180d) | DUE (<90d) | OVERDUE (<0d)
 *   status  := ACTIVE → EXPIRING inside 90 days; EXPIRING → ACTIVE when extended
 *
 * for every ACTIVE / EXPIRING mandate, writing only what changes (idempotent),
 * then queues renewal notifications for mandates newly DUE / OVERDUE.
 *
 *   node ops/nightly-status.mjs [--dry-run] [--today=YYYY-MM-DD]
 *
 * --dry-run asks the function to compute and report without writing.
 * Exit codes: 0 ok · 1 API/config error (so a cron/CI runner notices).
 * Env: SIDECAR_URL, OPS_TOKEN (see ops/lib/sidecar.mjs). TWENTY_API_URL and
 * TWENTY_API_KEY now live in the function's environment, not here.
 */
import { SidecarError, callSidecar, sidecarFromEnv } from './lib/sidecar.mjs';
import { parseArgs } from './lib/twenty-api.mjs';

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const dryRun = flags['dry-run'] === true;
  const today = typeof flags.today === 'string' ? flags.today : undefined;
  if (flags.today !== undefined && (!today || !/^\d{4}-\d{2}-\d{2}$/.test(today) || Number.isNaN(Date.parse(today)))) {
    throw new SidecarError(`--today is not a YYYY-MM-DD date: ${flags.today}`);
  }

  const result = await callSidecar(sidecarFromEnv(), 'renewals-check', { dryRun, ...(today ? { today } : {}) });

  const prefix = result.dryRun ? '[dry-run] ' : '';
  console.log(
    `${prefix}${result.mandatesChecked} live mandate(s) checked on ${result.today}; ` +
      `${result.overdueCount} overdue, ${result.dueCount} due, ${result.watchCount} watch; ${result.changes.length} to update`,
  );
  for (const c of result.changes) {
    const changes = Object.entries(c.patch)
      .map(([k, v]) => `${k}: ${c.from[k]} → ${v}`)
      .join(', ');
    console.log(`  ${c.name} (${c.days === null ? 'no renewal date' : `${c.days}d`}): ${changes}`);
  }
  const n = result.notifications;
  console.log(`${prefix}notifications: ${n.notificationsQueued} queued (${n.dueCount} newly due, ${n.overdueCount} newly overdue)`);
  if (!result.dryRun) {
    console.log(`updated ${result.updated} record(s); ${result.notesCreated} note(s)${result.noteErrors ? `, ${result.noteErrors} note error(s)` : ''}`);
  }
  if (result.noteErrors) process.exitCode = 1;
}

main().catch((error) => {
  const detail = error instanceof SidecarError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`nightly-status: ${error.message}${detail}`);
  process.exit(1);
});
