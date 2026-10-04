#!/usr/bin/env node
/**
 * C2 pricing preview: the public pricing with one Client Price Agreement's
 * prices applied, committed to a preview branch of the website repo so its
 * deploy workflow builds a Cloudflare Pages preview.
 *
 *   node ops/trigger-preview.mjs --agreement=<id | CPA-2026-001> [--pricing=pricing.json]
 *                                [--out=<file>] [--dry-run]
 *
 *   1. Reads pricing.json (--pricing, default ./pricing.json: what
 *      `npm run pricing:publish -- --dry-run` writes).
 *   2. Applies the agreement's current lines (shared/agreement-pricing.mjs
 *      applyAgreementToPricing): a line's price point gets its agreed price,
 *      or the published fee less discountPercent; a line without a price
 *      point discounts every price point of its offering. Lines for offerings
 *      that are not published are skipped and listed. The result is validated
 *      against PublicPricingV1 and versioned `<version>+<agreementCode>`.
 *   3. Writes it to --out (default pricing.preview.<agreementCode>.json).
 *   4. Commits it to branch `pricing-preview/<agreementCode>` of the website
 *      repo, at PORTAL_PRICING_PATH. The branch is created from
 *      PORTAL_BASE_BRANCH if missing; an identical file is not committed again.
 *
 * --dry-run stops after step 3 and prints the branch, path and commit message
 * it would use: no GitHub call at all, so it needs no PORTAL_* variables.
 *
 * The preview is a public URL (Cloudflare Pages previews are not access
 * controlled by default) and the branch name, so the URL, contains the
 * agreement code: put the preview behind Cloudflare Access before sending
 * client prices through it, and delete the branch when done.
 *
 * Exit codes: 0 ok · 1 config error, agreement not found, or invalid pricing.
 * Env: TWENTY_API_URL, TWENTY_API_KEY (read access is enough);
 * not with --dry-run: PORTAL_GITHUB_TOKEN (contents: write on the website
 * repo; it is under another GitHub account than this one),
 * PORTAL_PRICING_PATH (path of pricing.json in that repo), PORTAL_REPO
 * (default integrascientific/integra-scientific), PORTAL_BASE_BRANCH
 * (default main).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { applyAgreementToPricing, previewBranch } from '../shared/agreement-pricing.mjs';
import { PublicPricingV1 } from '../shared/public-pricing.mjs';
import { TwentyApiError, configFromEnv, eq, findAllRecords, findRecords, parseArgs } from './lib/twenty-api.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_REPO = 'integrascientific/integra-scientific';

// ------------------------------------------------------------------ GitHub

class GitHubError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.body = body;
  }
}

function githubFromEnv(env = process.env) {
  const token = env.PORTAL_GITHUB_TOKEN;
  const path = (env.PORTAL_PRICING_PATH ?? '').replace(/^\/+/, '');
  if (!token) throw new Error('PORTAL_GITHUB_TOKEN is not set (contents: write on the website repo); use --dry-run to only build the file');
  if (!path) throw new Error('PORTAL_PRICING_PATH is not set (where pricing.json lives in the website repo)');
  return { token, path, repo: env.PORTAL_REPO || DEFAULT_REPO, base: env.PORTAL_BASE_BRANCH || 'main' };
}

async function github(gh, method, route, body) {
  const response = await fetch(`https://api.github.com/repos/${gh.repo}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${gh.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (response.status === 404 && method === 'GET') return null;
  if (!response.ok) throw new GitHubError(`${method} ${route} → HTTP ${response.status}`, { status: response.status, body: json });
  return json;
}

const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

/** Create the branch from the base if missing, then put the file on it unless it is already identical. */
async function commitPreview(gh, branch, content, message) {
  if (!(await github(gh, 'GET', `/git/ref/heads/${encodePath(branch)}`))) {
    const base = await github(gh, 'GET', `/git/ref/heads/${encodePath(gh.base)}`);
    if (!base) throw new GitHubError(`base branch ${gh.base} not found in ${gh.repo}`);
    await github(gh, 'POST', '/git/refs', { ref: `refs/heads/${branch}`, sha: base.object.sha });
    console.log(`created branch ${branch} from ${gh.base}`);
  }
  const existing = await github(gh, 'GET', `/contents/${encodePath(gh.path)}?ref=${encodeURIComponent(branch)}`);
  if (existing && Buffer.from(existing.content ?? '', 'base64').toString('utf8') === content) return { unchanged: true };
  const result = await github(gh, 'PUT', `/contents/${encodePath(gh.path)}`, {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
    ...(existing?.sha ? { sha: existing.sha } : {}),
  });
  return { unchanged: false, sha: result.commit?.sha, url: result.commit?.html_url };
}

// -------------------------------------------------------------------- main

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const dryRun = flags['dry-run'] === true;
  const key = typeof flags.agreement === 'string' ? flags.agreement : null;
  if (!key) throw new Error('usage: trigger-preview.mjs --agreement=<id|code> [--pricing=pricing.json] [--out=<file>] [--dry-run]');
  const gh = dryRun ? null : githubFromEnv();

  const pricingPath = resolve(typeof flags.pricing === 'string' ? flags.pricing : 'pricing.json');
  if (!existsSync(pricingPath)) throw new Error(`${pricingPath} not found: run \`npm run pricing:publish -- --dry-run\` first, or pass --pricing=<file>`);
  const pricing = PublicPricingV1.parse(JSON.parse(readFileSync(pricingPath, 'utf8')));

  const config = configFromEnv();
  const [agreement] = await findRecords(config, 'clientPriceAgreements', { filter: eq(UUID.test(key) ? 'id' : 'agreementCode', key), limit: 1 });
  if (!agreement) throw new Error(`no client price agreement ${key}`);
  const branch = previewBranch(agreement.agreementCode);
  const [lines, offerings, pricePoints] = await Promise.all([
    findAllRecords(config, 'agreementLines', { filter: eq('agreementId', agreement.id) }),
    findAllRecords(config, 'offerings'),
    findAllRecords(config, 'pricePoints'),
  ]);

  const result = applyAgreementToPricing(pricing, { agreement, lines, offerings, pricePoints });
  for (const a of result.applied) console.log(`  ${a.correlationId}: ${a.fromEur === null ? 'on request' : `€${a.fromEur}`} → €${a.toEur}`);
  for (const s of result.skipped) console.warn(`warning: skipped ${s.lineName}: ${s.reason}`);
  if (!result.applied.length) console.warn('warning: the agreement changes no published price; the preview equals pricing.json');

  const content = `${JSON.stringify(result.pricing, null, 2)}\n`;
  const out = resolve(typeof flags.out === 'string' ? flags.out : `pricing.preview.${branch.slice('pricing-preview/'.length)}.json`);
  writeFileSync(out, content);
  console.log(`wrote ${out} (${result.pricing.version}): ${result.applied.length} price(s) changed, ${result.skipped.length} line(s) skipped`);

  const message = `Pricing preview for ${agreement.agreementCode} (${agreement.name || 'client price agreement'})\n\nGenerated by integra-crm ops/trigger-preview.mjs from pricing ${pricing.version}.`;
  if (dryRun) {
    console.log(`[dry-run] would commit to ${process.env.PORTAL_REPO || DEFAULT_REPO} branch ${branch}, path ${process.env.PORTAL_PRICING_PATH || '<PORTAL_PRICING_PATH>'}: "${message.split('\n')[0]}"`);
    return;
  }
  const commit = await commitPreview(gh, branch, content, message);
  if (commit.unchanged) console.log(`${gh.repo}@${branch}:${gh.path} already holds this preview; nothing committed`);
  else console.log(`committed ${commit.sha} to ${gh.repo}@${branch}${commit.url ? ` (${commit.url})` : ''}; its deploy workflow builds the preview`);
}

main().catch((error) => {
  const body = (error instanceof TwentyApiError || error instanceof GitHubError) && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`trigger-preview: ${error.message}${body}`);
  process.exit(1);
});
