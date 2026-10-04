#!/usr/bin/env node
/**
 * C2: sync the CRM's pricing to Stripe Products and Prices, via the
 * sync-pricing-to-stripe sidecar function.
 *
 *   node ops/sync-to-stripe.mjs [--dry-run] [--strategy=<crm id>] [--correlation-id=<id>[,<id>…]]
 *
 * With no filter, every live strategy is synced. --dry-run reads the CRM and
 * prints what would be sent to Stripe (the products and prices the CRM asks
 * for, and what is skipped), without calling the sidecar or Stripe; whether
 * each one is a create or an update is only known to the sidecar. Otherwise
 * ends with a table of what the sidecar did: created / updated / replaced /
 * unchanged.
 *
 * Exit codes: 0 ok · 1 config error or the sync failed.
 * Env: STRIPE_SECRET_KEY (here only to say whether this is test or live; the
 * sidecar uses its own, and a mismatch is flagged), TWENTY_API_URL,
 * TWENTY_API_KEY (--dry-run), SIDECAR_URL, OPS_TOKEN (ops/lib/sidecar.mjs).
 */
import { planSync, stripeMode } from '../shared/stripe-sync.mjs';
import { SidecarError, callSidecar, sidecarFromEnv } from './lib/sidecar.mjs';
import { TwentyApiError, configFromEnv, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

const euro = (cents) => `€${(cents / 100).toFixed(2)}`;

function table(headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) => `  ${cells.map((c, i) => String(c).padEnd(widths[i])).join('  ')}`.trimEnd();
  return [line(headers), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n');
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const dryRun = flags['dry-run'] === true;
  const filter = {
    ...(typeof flags.strategy === 'string' ? { strategyId: flags.strategy } : {}),
    ...(typeof flags['correlation-id'] === 'string' ? { correlationIds: flags['correlation-id'].split(',').map((s) => s.trim()).filter(Boolean) } : {}),
  };

  const key = process.env.STRIPE_SECRET_KEY;
  const mode = stripeMode(key);
  if (!mode) throw new Error('STRIPE_SECRET_KEY is not set, or is not a Stripe secret key (sk_test_… / sk_live_…)');
  console.log(`${dryRun ? '[dry-run] ' : ''}Stripe ${mode.toUpperCase()} mode${mode === 'live' && !dryRun ? ' — real products and prices' : ''}`);

  if (dryRun) {
    const twenty = configFromEnv();
    const [strategies, items] = await Promise.all([findAllRecords(twenty, 'pricingStrategies'), findAllRecords(twenty, 'priceItems')]);
    const plan = planSync(strategies, items, filter);
    console.log(`\nProducts (${plan.products.length})`);
    console.log(table(['id', 'name', 'active'], plan.products.map((p) => [p.id, p.name, p.active ? 'yes' : 'no (hidden or not live)'])));
    console.log(`\nPrices (${plan.prices.length})`);
    console.log(table(['lookup key', 'product', 'amount / year', 'metadata'], plan.prices.map((p) => [p.lookupKey, p.productId, euro(p.unitAmount), Object.entries(p.metadata).filter(([k]) => !['correlationId', 'source'].includes(k)).map(([k, v]) => `${k}=${v}`).join(' ')])));
    if (plan.skipped.length) {
      console.log(`\nSkipped (${plan.skipped.length})`);
      console.log(table(['price item', 'reason'], plan.skipped.map((s) => [s.correlationId, s.reason])));
    }
    console.log(`\nwould sync ${plan.products.length} product(s) and ${plan.prices.length} price(s), skip ${plan.skipped.length}; nothing sent`);
    return;
  }

  const result = await callSidecar(sidecarFromEnv(), 'sync-pricing-to-stripe', filter);
  if (result.stripeMode !== mode) {
    console.warn(`warning: the sidecar synced to Stripe ${result.stripeMode.toUpperCase()} mode, but STRIPE_SECRET_KEY here is ${mode}`);
  }
  console.log('');
  console.log(table(['kind', 'key', 'action'], result.changes.map((c) => [c.kind, c.key, c.action])));
  if (result.skipped.length) {
    console.log('');
    console.log(table(['skipped price item', 'reason'], result.skipped.map((s) => [s.correlationId, s.reason])));
  }
  console.log(`\n${JSON.stringify({ productsSynced: result.productsSynced, pricesSynced: result.pricesSynced, pricesSkipped: result.pricesSkipped, stripeMode: result.stripeMode })}`);
}

main().catch((error) => {
  if (error instanceof SidecarError && error.body) {
    console.error(`sync-to-stripe: ${error.message}\n${JSON.stringify(error.body, null, 2)}`);
  } else {
    const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
    console.error(`sync-to-stripe: ${error.message}${detail}`);
  }
  process.exit(1);
});
