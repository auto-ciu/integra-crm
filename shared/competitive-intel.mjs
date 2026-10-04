/**
 * Competitive intelligence (D3) — pure maths shared by research-ingest, the
 * CompetitiveIntelWidget, ops/export-competitive-intel.mjs and verify-model.
 * An "observation" is `{ observedAt (YYYY-MM-DD or ISO), competitorPriceEur, currencyCode }`.
 */

export const RECENT_DAYS = 90;
export const RISK_LEVELS = Object.freeze(['HIGH', 'MEDIUM', 'LOW']);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Latest `observedAt` of the observations as YYYY-MM-DD, or null. */
export function latestObservationDate(observations) {
  const dates = observations.map((o) => (typeof o.observedAt === 'string' ? o.observedAt.slice(0, 10) : '')).filter(Boolean);
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

/**
 * HIGH: ≥ 5 observations, the latest within 90 days.
 * MEDIUM: ≥ 2 observations, the latest within 90 days; or ≥ 5 gone stale.
 * LOW: everything else (none, one, or few and stale).
 */
export function riskLevel(count, latestDate, now = new Date()) {
  if (!count || !latestDate) return 'LOW';
  const age = (now.getTime() - new Date(`${latestDate}T00:00:00Z`).getTime()) / DAY_MS;
  const recent = Number.isFinite(age) && age <= RECENT_DAYS;
  if (recent && count >= 5) return 'HIGH';
  if ((recent && count >= 2) || count >= 5) return 'MEDIUM';
  return 'LOW';
}

/** Mean of the EUR-priced observations, rounded to cents, or null when there are none. */
export function averageEur(observations) {
  const prices = observations
    .filter((o) => (o.currencyCode ?? 'EUR') === 'EUR' && typeof o.competitorPriceEur === 'number' && Number.isFinite(o.competitorPriceEur))
    .map((o) => o.competitorPriceEur);
  return prices.length ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : null;
}

/** `{ priceObservationCount, riskLevel }` as stored on the Competitor. */
export function competitorSummary(observations, now = new Date()) {
  return {
    priceObservationCount: observations.length,
    riskLevel: riskLevel(observations.length, latestObservationDate(observations), now),
  };
}

const CSV_COLUMNS = ['name', 'website', 'productStreams', 'latestObservationDate', 'priceObservationCount', 'avgObservedPriceEur', 'riskLevel'];

/** One CSV cell: quoted when needed, and a leading = + - @ is defused so spreadsheets never run it as a formula. */
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV text (header + one line per row object keyed by CSV_COLUMNS), CRLF-free, trailing newline. */
export function toCsv(rows) {
  return `${[CSV_COLUMNS, ...rows.map((r) => CSV_COLUMNS.map((c) => r[c]))].map((line) => line.map(csvCell).join(',')).join('\n')}\n`;
}
