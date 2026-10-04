/**
 * Stream KPIs (B2) — pure maths behind StreamKpiWidget, so verify-model can
 * test it. A "line" is `{ opportunityId, stageName, stageOrder, estimatedValueEur,
 * probability (0–100), expectedCloseDate (YYYY-MM-DD), isActive }`.
 */

/** The standard pipeline every stream gets (ops/seed-stream-stages.mjs). */
export const STANDARD_STAGES = Object.freeze([
  { stageName: 'Awareness', order: 1 },
  { stageName: 'Interest', order: 2 },
  { stageName: 'Evaluation', order: 3 },
  { stageName: 'Negotiation', order: 4 },
  { stageName: 'Closed Won', order: 5 },
]);

/** [start, end) of the calendar quarter (UTC) containing `today`, as YYYY-MM-DD. */
export function quarterBounds(today = new Date()) {
  const year = today.getUTCFullYear();
  const startMonth = Math.floor(today.getUTCMonth() / 3) * 3;
  const iso = (y, m) => new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  return { start: iso(year, startMonth), end: iso(year, startMonth + 3) };
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const weighted = (l) => (num(l.estimatedValueEur) * Math.min(100, Math.max(0, num(l.probability)))) / 100;

export function computeStreamKpis(lines, today = new Date()) {
  const active = lines.filter((l) => l.isActive !== false);
  const { start, end } = quarterBounds(today);
  const byStage = new Map();
  for (const l of active) {
    const key = l.stageName ?? '—';
    const row = byStage.get(key) ?? { stageName: key, order: l.stageOrder ?? Number.MAX_SAFE_INTEGER, count: 0 };
    row.count += 1;
    byStage.set(key, row);
  }
  return {
    pipelineValueEur: active.reduce((sum, l) => sum + weighted(l), 0),
    openOpportunities: new Set(active.map((l) => l.opportunityId).filter(Boolean)).size,
    dealsByStage: [...byStage.values()].sort((a, b) => a.order - b.order || a.stageName.localeCompare(b.stageName)),
    expectedThisQuarterEur: active
      .filter((l) => l.expectedCloseDate && l.expectedCloseDate >= start && l.expectedCloseDate < end)
      .reduce((sum, l) => sum + weighted(l), 0),
    quarter: { start, end },
  };
}
