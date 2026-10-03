/**
 * Renewal urgency — the one piece of business logic shared by the
 * RenewalBanner / RenewalCountWidget front components (TS, bundled) and the
 * nightly ops script (plain node). Keep it dependency-free and pure.
 *
 * Windows (days until renewalDate, measured in whole UTC days):
 *   OVERDUE  days < 0
 *   DUE      0 ≤ days < 90
 *   WATCH    90 ≤ days ≤ 180
 *   NONE     days > 180, or no renewal date
 */

export const URGENCY = Object.freeze({
  NONE: 'NONE',
  WATCH: 'WATCH',
  DUE: 'DUE',
  OVERDUE: 'OVERDUE',
});

export const MANDATE_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  SIGNED: 'SIGNED',
  ACTIVE: 'ACTIVE',
  EXPIRING: 'EXPIRING',
  LAPSED: 'LAPSED',
});

export const DUE_WINDOW_DAYS = 90;
export const WATCH_WINDOW_DAYS = 180;

/** Hard dates the whole flywheel is scheduled around (ISO, UTC). */
export const KEY_DATES = Object.freeze({
  /** EU DPP Registry goes live. */
  dppRegistryLive: { iso: '2026-07-01', label: 'EU DPP Registry live' },
  /** 140th Canton Fair, phase 1 opening day — launch. Edit here only. */
  cantonFair: { iso: '2026-10-15', label: 'Canton Fair launch' },
  /** Battery DPP becomes mandatory. */
  batteryDppMandate: { iso: '2027-02-18', label: 'Battery DPP mandate' },
});

const MS_PER_DAY = 86_400_000;

/** Midnight UTC of the calendar day a Date (or ISO string) falls on. */
export function utcDay(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Whole days from `today` to `isoDate`. Negative when the date is past.
 * Returns null for missing / unparsable dates.
 */
export function daysUntil(isoDate, today = new Date()) {
  if (isoDate === null || isoDate === undefined || isoDate === '') return null;
  const target = utcDay(isoDate);
  const base = utcDay(today);
  if (target === null || base === null) return null;
  return Math.round((target - base) / MS_PER_DAY);
}

/** Urgency bucket for a day count (null → NONE). */
export function urgencyForDays(days) {
  if (days === null || days === undefined) return URGENCY.NONE;
  if (days < 0) return URGENCY.OVERDUE;
  if (days < DUE_WINDOW_DAYS) return URGENCY.DUE;
  if (days <= WATCH_WINDOW_DAYS) return URGENCY.WATCH;
  return URGENCY.NONE;
}

export function urgencyForDate(isoDate, today = new Date()) {
  return urgencyForDays(daysUntil(isoDate, today));
}

/**
 * Status transition the nightly job is allowed to make: an ACTIVE mandate
 * inside the 90-day window becomes EXPIRING. Nothing else is touched (a
 * human decides Signed→Active, Expiring→Lapsed, etc.).
 */
export function nextStatus(currentStatus, urgency) {
  if (
    currentStatus === MANDATE_STATUS.ACTIVE &&
    (urgency === URGENCY.DUE || urgency === URGENCY.OVERDUE)
  ) {
    return MANDATE_STATUS.EXPIRING;
  }
  return currentStatus;
}

/** True when renewalDate is inside the "renews within N days" window. */
export function renewsWithin(isoDate, windowDays = DUE_WINDOW_DAYS, today = new Date()) {
  const days = daysUntil(isoDate, today);
  return days !== null && days >= 0 && days < windowDays;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `14 Mar 2027` — en-GB short date, locale-independent so tests are stable. */
export function formatDayMonthYear(isoDate) {
  const ms = utcDay(isoDate);
  if (ms === null) return '';
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * The banner line. Examples:
 *   Renews 14 Mar 2027 · 178 days
 *   Renews today
 *   Overdue by 12 days · was 6 Sep 2026
 *   Renewal date not set
 */
export function renewalLine(isoDate, today = new Date()) {
  const days = daysUntil(isoDate, today);
  if (days === null) return 'Renewal date not set';
  const when = formatDayMonthYear(isoDate);
  if (days === 0) return `Renews today · ${when}`;
  if (days < 0) return `Overdue by ${-days} ${-days === 1 ? 'day' : 'days'} · was ${when}`;
  return `Renews ${when} · ${days} ${days === 1 ? 'day' : 'days'}`;
}
