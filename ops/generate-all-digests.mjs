#!/usr/bin/env node
// SCHEDULE: Run weekly via cron — 0 9 * * 1 (Monday 09:00 UTC)
// Cost estimate (claude-opus-5-5, $4 / $20 per MTok): ~1k input + 3–6k output
// tokens per stream ≈ $0.06–0.13; 9 streams ≈ $0.60–1.20 per run, ≈ $2.50–5
// per month. Hard ceiling: $10 per run (SESSION_BUDGET_USD, shared/digest.mjs).
/**
 * B2: generate an AI regulatory digest for every active ProductStream, via
 * the generate-stream-digest sidecar function (one StreamUpdate per stream,
 * plus StreamDocuments for newly cited EU acts).
 *
 *   node ops/generate-all-digests.mjs [--dry-run]
 *
 * The session budget is enforced across the run: each call is told what is
 * left (maxCostUsd), refuses a prompt whose worst case would not fit, and the
 * run stops once the remainder cannot cover one more call. --dry-run counts
 * each prompt (free) and reports the worst case, writing and spending nothing.
 *
 * Ends with `{ streamsProcessed, updatesCreated, documentsCreated, totalCost }`.
 * Exit codes: 0 ok · 1 config error or any stream failed.
 * Env: TWENTY_API_URL, TWENTY_API_KEY (to list streams; ops/lib/twenty-api.mjs),
 * SIDECAR_URL, OPS_TOKEN (ops/lib/sidecar.mjs).
 */
import { SESSION_BUDGET_USD, formatUsd, maxInputTokens } from '../shared/digest.mjs';
import { PRODUCT_STREAMS } from '../shared/streams.mjs';
import { SidecarError, callSidecar, sidecarFromEnv } from './lib/sidecar.mjs';
import { TwentyApiError, configFromEnv, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

const CATEGORY_BY_SLUG = new Map(PRODUCT_STREAMS.map((s) => [s.slug, s.category]));

async function main() {
  const dryRun = parseArgs(process.argv.slice(2))['dry-run'] === true;
  const prefix = dryRun ? '[dry-run] ' : '';
  const twenty = configFromEnv();
  const sidecar = sidecarFromEnv();

  const streams = await findAllRecords(twenty, 'productStreams', {
    filter: 'isActive[eq]:true',
    orderBy: 'sortOrder[AscNullsLast]',
  });
  console.log(`${prefix}${streams.length} active stream(s); session budget ${formatUsd(SESSION_BUDGET_USD)}`);

  const report = { streamsProcessed: 0, updatesCreated: 0, documentsCreated: 0, totalCost: 0 };
  let worstCase = 0;
  let failed = 0;

  for (const stream of streams) {
    const remaining = Math.floor((SESSION_BUDGET_USD - report.totalCost) * 1e6) / 1e6;
    if (maxInputTokens(remaining) === 0) {
      console.log(`budget: ${formatUsd(remaining)} left cannot cover another digest; stopping before ${stream.name}`);
      break;
    }
    const category = CATEGORY_BY_SLUG.get(stream.slug);
    const payload = {
      streamId: stream.id,
      streamName: String(stream.name),
      productCategories: [category ?? String(stream.name)],
      maxCostUsd: remaining,
      dryRun,
    };

    try {
      const result = await callSidecar(sidecar, 'generate-stream-digest', payload);
      report.streamsProcessed += 1;
      if (dryRun) {
        worstCase += result.costUsd;
        console.log(`  ${stream.name}: ${result.inputTokens} input tokens, worst case ${formatUsd(result.costUsd)}`);
        continue;
      }
      report.updatesCreated += result.updateId ? 1 : 0;
      report.documentsCreated += result.documentIds.length;
      report.totalCost += result.costUsd;
      console.log(`  ${stream.name}: update ${result.updateId}, ${result.documentIds.length} document(s), ${formatUsd(result.costUsd)}`);
    } catch (error) {
      if (!(error instanceof SidecarError) || !error.status) throw error; // config / network: give up
      const body = error.body ?? {};
      report.totalCost += typeof body.costUsd === 'number' ? body.costUsd : 0;
      if (body.error === 'budget_exceeded') {
        console.log(`budget: ${stream.name} would exceed the ${formatUsd(remaining)} left; stopping`);
        break;
      }
      failed += 1;
      console.error(`  ${stream.name}: FAILED ${error.message} ${JSON.stringify(body)}`);
    }
  }

  console.log(
    JSON.stringify({
      ...report,
      totalCost: formatUsd(report.totalCost),
      ...(dryRun ? { worstCaseCost: formatUsd(worstCase) } : {}),
      ...(failed ? { failed } : {}),
    }),
  );
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  const detail = (error instanceof TwentyApiError || error instanceof SidecarError) && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`generate-all-digests: ${error.message}${detail}`);
  process.exit(1);
});
