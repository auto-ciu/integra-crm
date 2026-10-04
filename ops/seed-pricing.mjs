#!/usr/bin/env node
/**
 * Create the canonical Offering, PricePoint and BundleItem records listed in
 * shared/public-pricing.mjs (C1): DPP, AR, the AR + DPP bundle, EPREL
 * registration, Battery Passport, Training Live / Recorded and Boss.
 *
 *   node ops/seed-pricing.mjs [--dry-run]
 *
 * Idempotent: offerings are keyed by `offeringCode`, price points by
 * `correlationId`, bundle items by (bundle, component). Anything that already
 * exists is left exactly as it is (staff own prices once seeded); missing
 * records are created.
 */
import { BUNDLE_ITEMS, OFFERINGS, bundleItemName, bundleItemProblem } from '../shared/public-pricing.mjs';
import { TwentyApiError, configFromEnv, createRecord, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

const richText = (markdown) => ({ markdown, blocknote: null });

async function main() {
  const dryRun = parseArgs(process.argv.slice(2))['dry-run'] === true;
  const config = configFromEnv();
  const say = (msg) => console.log(`${dryRun ? '[dry-run] ' : ''}${msg}`);

  const offerings = await findAllRecords(config, 'offerings');
  const pricePoints = await findAllRecords(config, 'pricePoints');
  const bundleItems = await findAllRecords(config, 'bundleItems');
  const offeringByCode = new Map(offerings.map((o) => [o.offeringCode, o]));
  const pointKeys = new Set(pricePoints.map((p) => p.correlationId));
  let created = 0;

  for (const { pricePoints: seedPoints, description, features, ...o } of OFFERINGS) {
    let offering = offeringByCode.get(o.offeringCode);
    if (!offering) {
      say(`create offering ${o.offeringCode} (${o.name})`);
      created += 1;
      offering = dryRun
        ? { id: `dry-run:${o.offeringCode}`, ...o }
        : await createRecord(config, 'offerings', {
            ...o,
            description: richText(description),
            features: richText(features.map((f) => `- ${f}`).join('\n')),
          });
      offeringByCode.set(o.offeringCode, offering);
    }
    for (const point of seedPoints.filter((p) => !pointKeys.has(p.correlationId))) {
      say(`create price point ${point.correlationId} (${point.name})`);
      created += 1;
      if (!dryRun) await createRecord(config, 'pricePoints', { ...point, offeringId: offering.id });
      pointKeys.add(point.correlationId);
    }
  }

  const itemKeys = new Set(bundleItems.map((b) => `${b.bundleId}:${b.componentId}`));
  for (const seed of BUNDLE_ITEMS) {
    const bundle = offeringByCode.get(seed.bundle);
    const component = offeringByCode.get(seed.component);
    const problem = bundleItemProblem(bundle, component);
    if (problem) throw new Error(`bundle item ${seed.bundle} → ${seed.component}: ${problem}`);
    if (itemKeys.has(`${bundle.id}:${component.id}`)) continue;
    const name = bundleItemName(bundle, component);
    say(`create bundle item ${name}`);
    created += 1;
    if (!dryRun) {
      await createRecord(config, 'bundleItems', {
        name,
        bundleId: bundle.id,
        componentId: component.id,
        included: seed.included,
        sortOrder: seed.sortOrder,
      });
    }
  }

  console.log(`${dryRun ? 'would create' : 'created'} ${created} record(s)`);
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`seed-pricing: ${error.message}${detail}`);
  process.exit(1);
});
