#!/usr/bin/env node
/**
 * Create the canonical PricingStrategy and PriceItem records listed in
 * shared/pricing.mjs (C1): DSP, AR and Bundle, each Beginner / Boost /
 * Builder / Boss (Boss on request).
 *
 *   node ops/seed-pricing.mjs [--dry-run]
 *
 * Idempotent, keyed by `correlationId`: strategies and items that already
 * exist are left exactly as they are (staff own prices once seeded), missing
 * ones are created. Every run then recomputes PricingStrategy.itemCount, so
 * re-running it refreshes the counts after items were added by hand.
 */
import { PRICING_STRATEGIES } from '../shared/pricing.mjs';
import {
  TwentyApiError,
  configFromEnv,
  createRecord,
  findAllRecords,
  parseArgs,
  updateRecord,
} from './lib/twenty-api.mjs';

async function main() {
  const dryRun = parseArgs(process.argv.slice(2))['dry-run'] === true;
  const config = configFromEnv();
  const say = (msg) => console.log(`${dryRun ? '[dry-run] ' : ''}${msg}`);

  const strategies = await findAllRecords(config, 'pricingStrategies');
  const items = await findAllRecords(config, 'priceItems');
  const strategyByKey = new Map(strategies.map((s) => [s.correlationId, s]));
  const itemKeys = new Set(items.map((i) => i.correlationId));
  let created = 0;

  for (const { items: seedItems, description, ...s } of PRICING_STRATEGIES) {
    let strategy = strategyByKey.get(s.correlationId);
    if (!strategy) {
      say(`create strategy ${s.correlationId} (${s.name})`);
      created += 1;
      strategy = dryRun
        ? { id: `dry-run:${s.correlationId}`, correlationId: s.correlationId }
        : await createRecord(config, 'pricingStrategies', {
            ...s,
            description: { markdown: description, blocknote: null },
          });
      strategies.push(strategy);
    }
    for (const item of seedItems.filter((i) => !itemKeys.has(i.correlationId))) {
      say(`create item ${item.correlationId} (${item.name})`);
      created += 1;
      const record = dryRun
        ? { id: `dry-run:${item.correlationId}` }
        : await createRecord(config, 'priceItems', { ...item, strategyId: strategy.id });
      items.push({ ...record, strategyId: strategy.id });
    }
  }

  let recounted = 0;
  for (const s of strategies) {
    const count = items.filter((i) => i.strategyId === s.id).length;
    if (s.itemCount === count) continue;
    say(`itemCount ${s.correlationId ?? s.id}: ${s.itemCount ?? '—'} → ${count}`);
    recounted += 1;
    if (!dryRun) await updateRecord(config, 'pricingStrategies', s.id, { itemCount: count });
  }

  console.log(`${dryRun ? 'would create' : 'created'} ${created} record(s), ${dryRun ? 'would update' : 'updated'} ${recounted} item count(s)`);
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`seed-pricing: ${error.message}${detail}`);
  process.exit(1);
});
