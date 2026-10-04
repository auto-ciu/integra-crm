#!/usr/bin/env node
/**
 * A2: enrich and score every DiscoveredCompany still waiting for review
 * (reviewStatus NEW, no icpScore): enrich-discovered-company (website →
 * description, categories, EU export evidence …), then score-discovered-company.
 *
 *   node ops/enrich-all-new.mjs [--dry-run] [--limit=50]
 *
 * Enrichment costs up to $0.50 a company (the plan expects ~$0.10), so --limit
 * (default 50) caps how many are done per run; the rest wait for the next.
 * A company that cannot be enriched (no website, site unreachable) is still
 * scored; one that fails either step is counted and the run carries on.
 * --dry-run lists the companies; calls nothing.
 *
 * Ends with `{ found, enriched, scored, failed, costUsd }`.
 * Exit codes: 0 ok · 1 config error or any company failed.
 * Env: TWENTY_API_URL, TWENTY_API_KEY (ops/lib/twenty-api.mjs), SIDECAR_URL,
 * OPS_TOKEN (ops/lib/sidecar.mjs).
 */
import { SidecarError, callSidecar, sidecarFromEnv } from './lib/sidecar.mjs';
import { configFromEnv, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

/** Answers that mean "nothing to enrich here", not "something broke". */
const SKIPPABLE = new Set(['no_website', 'website_unreachable']);

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const dryRun = flags['dry-run'] === true;
  const limit = Number(flags.limit ?? 50);
  if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer');
  const prefix = dryRun ? '[dry-run] ' : '';

  const twenty = configFromEnv();
  const all = await findAllRecords(twenty, 'discoveredCompanies', { filter: 'reviewStatus[eq]:NEW,icpScore[is]:NULL' });
  const batch = all.slice(0, limit);
  console.log(`${prefix}${all.length} new company(ies) without an ICP score; doing ${batch.length}`);
  if (dryRun) {
    for (const c of batch) console.log(`  ${c.companyName} (${c.id})`);
    return;
  }

  const sidecar = sidecarFromEnv();
  const report = { found: all.length, enriched: 0, scored: 0, failed: 0, costUsd: 0 };
  for (const company of batch) {
    try {
      try {
        const enriched = await callSidecar(sidecar, 'enrich-discovered-company', { discoveredCompanyId: company.id });
        report.enriched += 1;
        report.costUsd += enriched.costUsd ?? 0;
        console.log(`  ${company.companyName}: enriched ${enriched.fieldsEnriched.join(', ') || 'nothing new'}`);
      } catch (error) {
        if (!(error instanceof SidecarError) || !SKIPPABLE.has(error.body?.error)) throw error;
        console.log(`  ${company.companyName}: not enriched (${error.body.error})`);
      }
      await callSidecar(sidecar, 'score-discovered-company', { discoveredCompanyId: company.id });
      report.scored += 1;
    } catch (error) {
      report.failed += 1;
      console.error(`  ${company.companyName}: ${error.message}${error.body ? ` ${JSON.stringify(error.body)}` : ''}`);
    }
  }
  report.costUsd = Math.round(report.costUsd * 1e4) / 1e4;
  console.log(JSON.stringify(report));
  if (report.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`enrich-all-new: ${error.message}`);
  process.exit(1);
});
