#!/usr/bin/env node
/**
 * Publish the CRM's live pricing as pricing.json for the public website (C1).
 *
 *   node ops/publish-pricing.mjs [--out=pricing.json]
 *
 * Read-only: reads every PricingStrategy and PriceItem via REST and writes
 * shared/pricing.mjs buildPublicPricing() of them to --out (default
 * ./pricing.json). Only active strategies inside their validity window are
 * published, with public fields only; on-request items and HIDE strategies
 * carry no amounts.
 *
 * Manual step (for now): pricing.json belongs in the website repo,
 * https://github.com/integrascientific/integra-scientific, which lives under
 * a different GitHub account, so neither this script nor CI can commit there.
 * .github/workflows/publish-pricing.yml runs this script and uploads
 * pricing.json as the `pricing-json` artifact. To publish:
 *   1. Actions → "Publish pricing" → Run workflow (or run this script locally
 *      with TWENTY_API_URL / TWENTY_API_KEY set);
 *   2. download the `pricing-json` artifact;
 *   3. as an integrascientific member, commit it to integra-scientific on a
 *      branch, at the path integra-web reads, and open a PR there.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildPublicPricing } from '../shared/pricing.mjs';
import { TwentyApiError, configFromEnv, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const out = resolve(typeof flags.out === 'string' ? flags.out : 'pricing.json');
  const config = configFromEnv();

  const strategies = await findAllRecords(config, 'pricingStrategies');
  const items = await findAllRecords(config, 'priceItems');
  const pricing = buildPublicPricing(strategies, items);

  writeFileSync(out, `${JSON.stringify(pricing, null, 2)}\n`);
  const itemCount = pricing.strategies.reduce((n, s) => n + s.items.length, 0);
  console.log(`wrote ${out}: ${pricing.strategies.length} of ${strategies.length} strategies live, ${itemCount} items`);
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`publish-pricing: ${error.message}${detail}`);
  process.exit(1);
});
