/**
 * X5 training: the seed events and the registration rules. Shared by
 * ops/seed-training-events.mjs, src/functions/register-for-training.ts and
 * verify-model.mjs. Plain ESM, dependency-free.
 *
 * Option values as in src/options.ts: channel = TRAINING_CHANNEL,
 * language = LANGUAGE.
 */

export const TRAINING_EVENTS = Object.freeze([
  {
    name: 'EU Battery Regulation Workshop',
    date: '2026-11-15',
    channel: 'WEBINAR',
    location: 'Online',
    language: 'EN_ZH',
  },
  {
    name: 'DPP Compliance Masterclass',
    date: '2026-12-01',
    channel: 'ON_SITE',
    location: 'Shanghai',
    language: 'ZH',
  },
  {
    name: 'EU REACH & CLP Update for Electronics',
    date: '2027-01-20',
    channel: 'WEBINAR',
    location: 'Online',
    language: 'EN',
  },
]);

/**
 * True once the event's day is over (UTC). An event on today's date can
 * still be registered for; one without a date is never "passed".
 */
export function eventHasPassed(date, now = new Date()) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(date)) return false;
  return date.slice(0, 10) < now.toISOString().slice(0, 10);
}

/** Registrations that still hold a place; a cancelled one may register again. */
export const isActiveRegistration = (registration) => registration?.status !== 'CANCELLED';

/** TrainingRegistration.name: "<event> — <person>". */
export function registrationName(eventTitle, person) {
  const name = [person?.firstName, person?.lastName].filter((s) => typeof s === 'string' && s.trim()).join(' ').trim();
  return `${String(eventTitle ?? '').trim() || 'Training'} — ${name || 'Unnamed attendee'}`.slice(0, 200);
}
