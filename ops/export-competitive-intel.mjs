#!/usr/bin/env node
/**
 * Export every Competitor with its price observations as CSV (D3).
 *
 *   node ops/export-competitive-intel.mjs [--out=<file>] [--today=YYYY-MM-DD]
 *
 * Columns: name, website, productStreams, latestObservationDate,
 * priceObservationCount, avgObservedPriceEur (EUR observations only),
 * riskLevel. Computed from the observations themselves
 * (shared/competitive-intel.mjs), not from the stored summary fields. Writes
 * competitive-intel-<date>.csv in the current directory unless --out is given.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { averageEur, latestObservationDate, riskLevel, toCsv } from '../shared/competitive-intel.mjs';
import { TwentyApiError, configFromEnv, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const today = typeof flags.today === 'string' ? flags.today : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`--today must be YYYY-MM-DD, got ${today}`);
  const out = resolve(typeof flags.out === 'string' ? flags.out : `competitive-intel-${today}.csv`);
  const config = configFromEnv();

  const [competitors, observations, streams] = await Promise.all([
    findAllRecords(config, 'competitors'),
    findAllRecords(config, 'competitorPriceObservations'),
    findAllRecords(config, 'productStreams'),
  ]);
  const streamNames = new Map(streams.map((s) => [s.id, s.name]));
  const byCompetitor = new Map();
  for (const o of observations) {
    if (!o.competitorId) continue;
    byCompetitor.set(o.competitorId, [...(byCompetitor.get(o.competitorId) ?? []), o]);
  }

  const now = new Date(`${today}T12:00:00Z`);
  const rows = competitors
    .map((c) => {
      const obs = byCompetitor.get(c.id) ?? [];
      const latest = latestObservationDate(obs);
      return {
        name: c.name,
        website: c.website?.primaryLinkUrl ?? '',
        productStreams: streamNames.get(c.competitorOfId) ?? '',
        latestObservationDate: latest ?? '',
        priceObservationCount: obs.length,
        avgObservedPriceEur: averageEur(obs) ?? '',
        riskLevel: riskLevel(obs.length, latest, now),
      };
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  writeFileSync(out, toCsv(rows));
  console.log(`wrote ${out}: ${rows.length} competitors, ${observations.length} price observations`);
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`export-competitive-intel: ${error.message}${detail}`);
  process.exit(1);
});
