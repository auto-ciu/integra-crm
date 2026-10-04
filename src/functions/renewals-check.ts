/**
 * renewals-check — REST sidecar (F0.3b) Lambda: the nightly AR Mandate job,
 * ported from ops/nightly-status.mjs (which now only calls this). POST
 * `{ dryRun?, today? }` with bearer OPS_TOKEN.
 *
 * For every live mandate (status ACTIVE or EXPIRING), with the maths in
 * shared/urgency.mjs (planMandate):
 *   urgency := OVERDUE (<0d) | DUE (<90d) | WATCH (90–180d) | NONE (>180d or no date)
 *   status  := ACTIVE → EXPIRING inside 90 days; EXPIRING → ACTIVE once the
 *              renewal date is extended past them
 * PATCHes only the mandates whose values change, so re-running is a no-op
 * (idempotent) and the audit log stays quiet. Each changed mandate also gets
 * a Note ("Renewal urgency: WATCH → DUE") so the change shows on its
 * timeline; a failed note is logged and counted, not fatal.
 *
 * Then hands the urgency changes to send-renewal-notifications (newly DUE /
 * OVERDUE). `dryRun` computes and returns everything but writes nothing.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can write
 * arMandates / notes / noteTargets), OPS_TOKEN.
 */
import { z } from 'zod';

import {
  TwentyApiError,
  configFromEnv,
  createRecord,
  findAllRecords,
  updateRecord,
  type TwentyConfig,
  type TwentyRecord,
} from '../../ops/lib/twenty-api';
import { LIVE_MANDATE_STATUSES, URGENCY, planMandate, renewalLine } from '../../shared/urgency.mjs';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';
import { queueRenewalNotifications, type NotificationsResult, type UrgencyTransition } from './send-renewal-notifications';

export const RenewalsPayload = z.object({
  dryRun: z.boolean().default(false),
  /** Run as if it were this UTC day (backfills, tests). */
  today: z.iso.date().optional(),
});

type Urgency = UrgencyTransition['to'];

export type MandateChange = {
  id: string;
  name: string;
  renewalDate: string | null;
  days: number | null;
  from: { urgency: string; status: string };
  patch: { urgency?: Urgency; status?: string };
};

export type RenewalsResult = {
  mandatesChecked: number;
  /** DUE + OVERDUE. */
  urgentCount: number;
  overdueCount: number;
  dueCount: number;
  watchCount: number;
  updated: number;
  notesCreated: number;
  noteErrors: number;
  dryRun: boolean;
  today: string;
  changes: MandateChange[];
  notifications: NotificationsResult;
};

/** Pure: the counts and the per-mandate changes for these mandates on `today`. */
export function planRenewals(mandates: TwentyRecord[], today: Date) {
  const live = mandates.filter((m) => (LIVE_MANDATE_STATUSES as readonly unknown[]).includes(m.status));
  const counts = { [URGENCY.NONE]: 0, [URGENCY.WATCH]: 0, [URGENCY.DUE]: 0, [URGENCY.OVERDUE]: 0 } as Record<Urgency, number>;
  const changes: MandateChange[] = [];
  for (const m of live) {
    const plan = planMandate(m, today);
    counts[plan.urgency as Urgency] += 1;
    if (Object.keys(plan.patch).length === 0) continue;
    changes.push({
      id: m.id,
      name: String(m.name || m.id),
      renewalDate: (m.renewalDate as string | null) ?? null,
      days: plan.days,
      from: plan.from,
      patch: plan.patch as MandateChange['patch'],
    });
  }
  return { checked: live.length, counts, changes };
}

function noteFor(change: MandateChange, today: Date) {
  const steps = Object.entries(change.patch).map(
    ([field, to]) => `- ${field === 'urgency' ? 'Urgency' : 'Status'}: ${change.from[field as 'urgency' | 'status']} → ${to}`,
  );
  const headline = change.patch.urgency
    ? `Renewal urgency: ${change.from.urgency} → ${change.patch.urgency}`
    : `Mandate status: ${change.from.status} → ${change.patch.status}`;
  return {
    title: headline,
    markdown: `${renewalLine(change.renewalDate, today)}\n\n${steps.join('\n')}\n\n_Set by renewals-check on ${today.toISOString().slice(0, 10)}._`,
  };
}

/** A Note linked to the mandate (Twenty's noteTargets join on `arMandateId`). */
async function addNote(config: TwentyConfig, change: MandateChange, today: Date) {
  const { title, markdown } = noteFor(change, today);
  const note = await createRecord(config, 'notes', { title, bodyV2: { markdown, blocknote: null } });
  await createRecord(config, 'noteTargets', { noteId: note.id, arMandateId: change.id });
}

export async function checkRenewals(
  config: TwentyConfig,
  { dryRun = false, today = new Date() }: { dryRun?: boolean; today?: Date } = {},
): Promise<RenewalsResult> {
  const mandates = await findAllRecords(config, 'arMandates', { orderBy: 'renewalDate[AscNullsLast]' });
  const { checked, counts, changes } = planRenewals(mandates, today);

  let updated = 0;
  let notesCreated = 0;
  let noteErrors = 0;
  if (!dryRun) {
    for (const change of changes) {
      await updateRecord(config, 'arMandates', change.id, change.patch);
      updated += 1;
      try {
        await addNote(config, change, today);
        notesCreated += 1;
      } catch (error) {
        noteErrors += 1;
        console.error('[renewals-check] note failed', change.id, error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
      }
    }
  }

  const transitions: UrgencyTransition[] = changes
    .filter((c) => c.patch.urgency)
    .map((c) => ({
      mandateId: c.id,
      name: c.name,
      renewalDate: c.renewalDate,
      days: c.days,
      from: c.from.urgency as Urgency,
      to: c.patch.urgency as Urgency,
    }));
  const notifications = queueRenewalNotifications(transitions, { dryRun });

  return {
    mandatesChecked: checked,
    urgentCount: counts.DUE + counts.OVERDUE,
    overdueCount: counts.OVERDUE,
    dueCount: counts.DUE,
    watchCount: counts.WATCH,
    updated,
    notesCreated,
    noteErrors,
    dryRun,
    today: today.toISOString().slice(0, 10),
    changes,
    notifications,
  };
}

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  // `{}` (or `null`) is a real run, today. readAuthorisedJson rejects an empty body.
  const parsed = RenewalsPayload.safeParse(request.body ?? {});
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const today = parsed.data.today ? new Date(`${parsed.data.today}T00:00:00Z`) : new Date();
    return json(200, await checkRenewals(configFromEnv(), { dryRun: parsed.data.dryRun, today }));
  } catch (error) {
    console.error('[renewals-check]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
