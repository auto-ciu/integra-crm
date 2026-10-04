/**
 * send-renewal-notifications — REST sidecar (F0.3b) Lambda. Called
 * in-process by renewals-check with the urgency changes it just wrote, and
 * invocable on its own (POST `{ transitions: [...] }`, bearer OPS_TOKEN).
 *
 * Picks the mandates that are NEWLY in DUE or OVERDUE (urgency changed into
 * one of them this run, including DUE → OVERDUE) and queues one internal
 * notification each.
 *
 * STUB: "queue" means a console line for now; there is no notification
 * object and nothing is e-mailed. SES (to the account owner) is the next step.
 *
 * Env: OPS_TOKEN (bearer for the standalone endpoint). No Twenty access.
 */
import { z } from 'zod';

import { URGENCY, formatDayMonthYear } from '../../shared/urgency.mjs';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

const Urgency = z.enum(['NONE', 'WATCH', 'DUE', 'OVERDUE']);

export const UrgencyTransition = z.object({
  mandateId: z.string().min(1),
  name: z.string(),
  renewalDate: z.string().nullable(),
  days: z.number().int().nullable(),
  from: Urgency,
  to: Urgency,
});
export type UrgencyTransition = z.infer<typeof UrgencyTransition>;

export const NotificationsPayload = z.object({
  transitions: z.array(UrgencyTransition).max(10_000),
  dryRun: z.boolean().default(false),
});

export type NotificationsResult = { notificationsQueued: number; dueCount: number; overdueCount: number };

/** Transitions INTO due / overdue. Staying put, or easing off, notifies nobody. */
export const newlyUrgent = (transitions: UrgencyTransition[]) =>
  transitions.filter((t) => t.from !== t.to && (t.to === URGENCY.DUE || t.to === URGENCY.OVERDUE));

export function queueRenewalNotifications(transitions: UrgencyTransition[], { dryRun = false } = {}): NotificationsResult {
  const urgent = newlyUrgent(transitions);
  for (const t of urgent) {
    const when = t.renewalDate ? formatDayMonthYear(t.renewalDate) : 'no date';
    const days = t.days === null ? '' : t.days < 0 ? ` · overdue by ${-t.days}d` : ` · ${t.days}d left`;
    // STUB: the SES send / notification record goes here.
    console.log(`[send-renewal-notifications]${dryRun ? ' [dry-run]' : ''} ${t.to}: ${t.name} (${t.mandateId}) renews ${when}${days}`);
  }
  return {
    notificationsQueued: urgent.length,
    dueCount: urgent.filter((t) => t.to === URGENCY.DUE).length,
    overdueCount: urgent.filter((t) => t.to === URGENCY.OVERDUE).length,
  };
}

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  const parsed = NotificationsPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return json(200, queueRenewalNotifications(parsed.data.transitions, { dryRun: parsed.data.dryRun }));
};
