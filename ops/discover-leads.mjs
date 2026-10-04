#!/usr/bin/env node
/**
 * A2: start a LinkedIn company discovery run on Apify via the
 * run-linkedin-discovery sidecar function.
 *
 *   node ops/discover-leads.mjs [--config=leads.json] [--dry-run] [--wait] [--timeout=900]
 *
 * The query comes from a JSON file (--config) or from env vars:
 *
 *   { "name": "Battery EU exporters Q4 2026",
 *     "query": { "searches": ["CATL", "EVE Energy"],                     company names
 *                "companies": ["https://www.linkedin.com/company/byd"] }, company pages
 *     "maxResults": 50, "spendLimitUsd": 1 }
 *
 *   DISCOVERY_NAME, DISCOVERY_SEARCHES and DISCOVERY_COMPANIES (both
 *   ";"-separated), DISCOVERY_MAX_RESULTS (default: one per input),
 *   DISCOVERY_SPEND_LIMIT_USD (default $1).
 *
 * --dry-run  print the query and the worst-case cost; calls nothing.
 * --wait     poll apify-webhook until the run has been imported (for when
 *            Apify's webhook cannot reach the sidecar, e.g. local runs).
 *
 * Exit codes: 0 ok · 1 config error, refused, failed or timed out.
 * Env: SIDECAR_URL, OPS_TOKEN (ops/lib/sidecar.mjs); with --wait also
 * APIFY_WEBHOOK_TOKEN (apify-webhook's bearer) and optionally
 * DISCOVERY_POLL_SECONDS (default 15).
 */
import { readFileSync } from 'node:fs';

import {
  APIFY_ACTOR,
  APIFY_ACTOR_BUILD,
  MAX_RESULTS_PER_RUN,
  PRICE_PER_COMPANY_USD,
  RUN_SPEND_CEILING_USD,
  companyPageUrl,
  estimateCostUsd,
} from '../shared/lead-discovery.mjs';
import { formatUsd } from '../shared/digest.mjs';
import { SidecarError, callSidecar, sidecarFromEnv } from './lib/sidecar.mjs';
import { parseArgs } from './lib/twenty-api.mjs';

const DEFAULT_SPEND_LIMIT_USD = 1;
const POLL_SECONDS = Number(process.env.DISCOVERY_POLL_SECONDS ?? 15);

const list = (value) =>
  String(value ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

function readRequest(flags, env = process.env) {
  const file = typeof flags.config === 'string' ? JSON.parse(readFileSync(flags.config, 'utf8')) : {};
  const searches = file.query?.searches ?? list(env.DISCOVERY_SEARCHES);
  const companies = file.query?.companies ?? list(env.DISCOVERY_COMPANIES);
  const inputs = searches.length + companies.length;
  const maxResults = Number(file.maxResults ?? env.DISCOVERY_MAX_RESULTS ?? inputs);
  const spendLimitUsd = Number(file.spendLimitUsd ?? env.DISCOVERY_SPEND_LIMIT_USD ?? DEFAULT_SPEND_LIMIT_USD);
  const name = file.name ?? env.DISCOVERY_NAME;
  return { ...(name ? { name } : {}), query: { searches, companies }, maxResults, spendLimitUsd };
}

/** The checks run-linkedin-discovery makes, so a dry run fails the same way. */
function problems(request) {
  const { searches, companies } = request.query;
  const out = [];
  const inputs = searches.length + companies.length;
  if (inputs === 0) out.push('no company names (searches) or LinkedIn company URLs (companies) given');
  const people = companies.filter((url) => !companyPageUrl(url));
  if (people.length) out.push(`not LinkedIn company pages (only /company/ or /showcase/ URLs are allowed): ${people.join(', ')}`);
  if (!Number.isInteger(request.maxResults) || request.maxResults < 1 || request.maxResults > MAX_RESULTS_PER_RUN) {
    out.push(`maxResults must be 1–${MAX_RESULTS_PER_RUN}`);
  } else if (inputs > request.maxResults) {
    out.push(`${inputs} inputs but maxResults ${request.maxResults}`);
  }
  if (!(request.spendLimitUsd > 0) || request.spendLimitUsd > RUN_SPEND_CEILING_USD) {
    out.push(`spendLimitUsd must be above 0 and at most ${formatUsd(RUN_SPEND_CEILING_USD)}`);
  } else if (estimateCostUsd(request.maxResults) > request.spendLimitUsd) {
    out.push(`worst case ${money(estimateCostUsd(request.maxResults))} is over the ${money(request.spendLimitUsd)} spend limit`);
  }
  return out;
}

/** Sub-dime estimates keep four decimals ("$0.0045"), the rest two. */
const money = (usd) => (usd < 0.1 ? `$${usd.toFixed(4)}` : formatUsd(usd));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForImport(sidecar, runId, timeoutSeconds) {
  const token = process.env.APIFY_WEBHOOK_TOKEN;
  if (!token) throw new SidecarError('--wait needs APIFY_WEBHOOK_TOKEN (the bearer of the apify-webhook function)');
  const webhook = { ...sidecar, token };
  const deadline = Date.now() + timeoutSeconds * 1000;
  for (;;) {
    const result = await callSidecar(webhook, 'apify-webhook', { eventData: { actorRunId: runId } });
    if (result?.status !== 'RUNNING') return result;
    if (Date.now() > deadline) return null;
    console.log(`  run ${runId} still running; checking again in ${POLL_SECONDS}s`);
    await sleep(POLL_SECONDS * 1000);
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const dryRun = flags['dry-run'] === true;
  const request = readRequest(flags);
  const issues = problems(request);

  const { searches, companies } = request.query;
  console.log(`${dryRun ? '[dry-run] ' : ''}${APIFY_ACTOR} build ${APIFY_ACTOR_BUILD}${request.name ? ` · "${request.name}"` : ''}`);
  console.log(`  ${searches.length} company name(s): ${searches.slice(0, 10).join('; ')}${searches.length > 10 ? '; …' : ''}`);
  console.log(`  ${companies.length} company page(s): ${companies.slice(0, 10).join(' ')}${companies.length > 10 ? ' …' : ''}`);
  console.log(
    `  maxResults ${request.maxResults} × ${formatUsd(PRICE_PER_COMPANY_USD * 1000)}/1k → worst case ${money(estimateCostUsd(request.maxResults))} (limit ${money(request.spendLimitUsd)})`,
  );
  if (issues.length) {
    for (const issue of issues) console.error(`  refused: ${issue}`);
    process.exitCode = 1;
    return;
  }
  if (dryRun) {
    console.log('  would start the run (the sidecar also needs APIFY_ENABLED=true)');
    return;
  }

  const sidecar = sidecarFromEnv();
  const started = await callSidecar(sidecar, 'run-linkedin-discovery', request);
  console.log(`started Apify run ${started.runId} → LeadDiscoveryRun ${started.discoveryRunId}`);
  if (flags.wait !== true) return;

  const result = await waitForImport(sidecar, started.runId, Number(flags.timeout ?? 900));
  if (!result) {
    console.error(`timed out waiting for run ${started.runId}; re-run with --wait later or let the webhook import it`);
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(result));
  if (result.status !== 'COMPLETED') process.exitCode = 1;
}

main().catch((error) => {
  const detail = error instanceof SidecarError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`discover-leads: ${error.message}${detail}`);
  process.exit(1);
});
