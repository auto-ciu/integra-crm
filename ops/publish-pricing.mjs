#!/usr/bin/env node
/**
 * Publish the CRM's live pricing as pricing.json for the public website (C1).
 *
 *   node ops/publish-pricing.mjs [--out=pricing.json] [--commit-sha=<sha>] [--dry-run]
 *
 * Reads every Offering, PricePoint and BundleItem via REST, builds the
 * PublicPricingV1 document (shared/public-pricing.mjs buildPublicPricing,
 * validated: a document that fails the schema is never written) and writes it
 * to --out (default ./pricing.json). Only active offerings inside their
 * validity window are published, with public fields only; legacy price points
 * are skipped and on-request ones carry annualFeeEur null.
 *
 * Then records the run as a PricingPublication (version `YYYY-MM-DD.N`, the
 * commit from --commit-sha / COMMIT_SHA / GITHUB_SHA, isLive true) and clears
 * isLive on the previous one. Optional PUBLISHED_BY_MEMBER_ID is the
 * workspace member id to set as publishedBy. --dry-run writes the file but
 * creates no PricingPublication, so the API key then needs read access only.
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

import { buildPublicPricing, invalidBundleItems, nextVersion } from '../shared/public-pricing.mjs';
import { TwentyApiError, configFromEnv, createRecord, findAllRecords, parseArgs, updateRecord } from './lib/twenty-api.mjs';

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const out = resolve(typeof flags.out === 'string' ? flags.out : 'pricing.json');
  const dryRun = flags['dry-run'] === true;
  const config = configFromEnv();
  const now = new Date();

  const [offerings, pricePoints, bundleItems, publications] = await Promise.all([
    findAllRecords(config, 'offerings'),
    findAllRecords(config, 'pricePoints'),
    findAllRecords(config, 'bundleItems'),
    findAllRecords(config, 'pricingPublications'),
  ]);
  for (const { item, problem } of invalidBundleItems(offerings, bundleItems)) {
    console.warn(`warning: ignoring bundle item ${item.name ?? item.id}: ${problem}`);
  }

  const version = nextVersion(publications, now);
  const pricing = buildPublicPricing({ offerings, pricePoints, bundleItems }, { now, version });

  writeFileSync(out, `${JSON.stringify(pricing, null, 2)}\n`);
  const pointCount = pricing.offerings.reduce((n, o) => n + o.pricePoints.length, 0);
  console.log(`wrote ${out} (${version}): ${pricing.offerings.length} of ${offerings.length} offerings live, ${pointCount} price points`);

  if (dryRun) {
    console.log('[dry-run] no PricingPublication created');
    return;
  }
  for (const previous of publications.filter((p) => p.isLive === true)) {
    await updateRecord(config, 'pricingPublications', previous.id, { isLive: false });
  }
  const commitSha = (typeof flags['commit-sha'] === 'string' && flags['commit-sha']) || process.env.COMMIT_SHA || process.env.GITHUB_SHA || null;
  await createRecord(config, 'pricingPublications', {
    name: `Pricing ${version}`,
    publishedAt: pricing.publishedAt,
    version,
    commitSha,
    isLive: true,
    ...(process.env.PUBLISHED_BY_MEMBER_ID ? { publishedById: process.env.PUBLISHED_BY_MEMBER_ID } : {}),
  });
  console.log(`recorded PricingPublication ${version}`);
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`publish-pricing: ${error.message}${detail}`);
  process.exit(1);
});
