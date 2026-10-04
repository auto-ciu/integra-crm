#!/usr/bin/env node
/**
 * Static model check for the Integra CRM App — dependency-free, no build.
 *
 *   node verify-model.mjs        (npm run verify)
 *
 * Asserts, from the SOURCE files (not from a running Twenty):
 *   1. src/ids.ts: every value is a well-formed v4 UUID and unique; none of
 *      them collides with Twenty's standard ids in src/standard-ids.ts.
 *   2. Every define*({ … }) call in src/ declares a universalIdentifier.
 *   3. Every defineObject declares nameSingular/namePlural/labelSingular/
 *      labelPlural and a labelIdentifier field.
 *   4. shared/stages.mjs is exactly Lead → Webinar attended → Trial →
 *      Subscribed → Renewal due → Lost, and the Pipeline kanban is built
 *      from it (and named so the e2e finds it).
 *   5. The two e2e test ids exist in the widget sources.
 *   6. The four Company labels the e2e looks for start with the English text.
 *   7. Front components use --t-* tokens: no raw hex except the brand gold
 *      pair (#C5A059 fill, #775A19 text) and only as var() fallbacks.
 *   8. The renewal-urgency maths matches the spec's windows.
 *   9. Every file with a define*() call has exactly one, as
 *      `export default defineX(` — the only form twenty-sdk's manifest
 *      builder registers (named exports and `export default someConst` are
 *      silently skipped).
 *  10. E1: the Enquiries inbox kanban is built from ENQUIRY_STATUS, and
 *      shared/icp.mjs never matches a Company by a freemail domain.
 *  11. B1/A1: shared/streams.mjs has one stream per PRODUCT_CATEGORY value
 *      (unique slugs), the fair-lead intake and score weights cover the same
 *      values, the score rules give the expected scores, and no custom object
 *      redeclares a Twenty system field (createdAt, …).
 *  12. C1 pricing: shared/pricing.mjs D3 display rules cover every strategy
 *      type, its tiers match the TIER select, the seed is three four-tier
 *      ladders (Boss on request, Bundle = DPP + AR less the discount), and
 *      buildPublicPricing publishes only live strategies, only public fields,
 *      and no amounts for on-request items or HIDE strategies.
 *
 * Exit 0 with a ✓ per check, or 1 listing every failure.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REQUIRED_STAGES = ['Lead', 'Webinar attended', 'Trial', 'Subscribed', 'Renewal due', 'Lost'];
const REQUIRED_COMPANY_LABELS = ['WeChat ID', 'Province', 'Product category', 'Tier'];
const ALLOWED_HEX = new Set(['#c5a059', '#775a19']);
const EXPECTED_OBJECTS = [
  'ArMandate', 'MandateProduct', 'TrainingEvent', 'Authority',
  'Enquiry', 'EnquiryMessage', 'EnquiryRoutingRule',
  'ProductStream', 'StreamUpdate', 'StreamDocument', 'StreamContact', 'FairLead',
  'PricingStrategy', 'PriceItem',
];

const failures = [];
const passes = [];
const ok = (msg) => passes.push(msg);
const fail = (msg) => failures.push(msg);
const rel = (p) => relative(ROOT, p);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const sources = Object.fromEntries(walk(SRC).map((f) => [f, readFileSync(f, 'utf8')]));
const read = (name) => readFileSync(join(ROOT, name), 'utf8');

// Doc comments legitimately mention `defineObject({ ... })` in prose (e.g.
// src/lib/fields.ts), which would otherwise be counted as a call.
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, '');
const DEFINE_CALL = /\b(define(?:Application|ApplicationRole|Object|Field|View|PageLayout|PageLayoutTab|PageLayoutWidget|FrontComponent|NavigationMenuItem|LogicFunction))\(\{/g;

// ---------------------------------------------------------------- 1. ids.ts
{
  const idsSource = read('src/ids.ts');
  const values = [...idsSource.matchAll(/'([0-9a-fA-F-]{36})'/g)].map((m) => m[1]);
  const bad = values.filter((v) => !V4.test(v));
  if (values.length === 0) fail('src/ids.ts: no UUID literals found');
  if (bad.length) fail(`src/ids.ts: not valid v4 UUIDs: ${bad.join(', ')}`);
  const seen = new Map();
  const dupes = values.filter((v) => (seen.set(v, (seen.get(v) ?? 0) + 1), seen.get(v) === 2));
  if (dupes.length) fail(`src/ids.ts: duplicate UUIDs: ${dupes.join(', ')}`);

  const standardSource = read('src/standard-ids.ts');
  const standard = new Set([...standardSource.matchAll(/'([0-9a-f-]{36})'/g)].map((m) => m[1]));
  const collisions = values.filter((v) => standard.has(v));
  if (collisions.length) fail(`src/ids.ts: collides with Twenty standard ids: ${collisions.join(', ')}`);
  if (!bad.length && !dupes.length && !collisions.length) {
    ok(`src/ids.ts: ${values.length} UUIDs, all v4, all unique, none colliding with ${standard.size} standard ids`);
  }
}

// ------------------------------------------------- 2. every define* has a uid
{
  let calls = 0;
  const missing = [];
  for (const [file, raw] of Object.entries(sources)) {
    const text = stripComments(raw);
    const starts = [...text.matchAll(DEFINE_CALL)];
    for (let i = 0; i < starts.length; i += 1) {
      calls += 1;
      const from = starts[i].index;
      const to = i + 1 < starts.length ? starts[i + 1].index : text.length;
      const body = text.slice(from, to);
      // The uid must appear before the first nested `fields:` / `tabs:` / `widgets:` block.
      const head = body.split(/\n\s*(?:fields|tabs|widgets):/)[0];
      if (!/universalIdentifier\s*[:,]/.test(head)) {
        const line = text.slice(0, from).split('\n').length;
        missing.push(`${rel(file)}:${line} ${starts[i][1]}`);
      }
    }
  }
  if (calls === 0) fail('no define*() calls found under src/');
  if (missing.length) fail(`define*() without universalIdentifier: ${missing.join('; ')}`);
  else ok(`${calls} define*() calls under src/ all declare a universalIdentifier`);
}

// ------------------------------------------------- 3. object shape + label id
{
  const objectFiles = Object.entries(sources).filter(([f]) => f.endsWith('.object.ts'));
  const problems = [];
  for (const [file, text] of objectFiles) {
    for (const key of ['nameSingular', 'namePlural', 'labelSingular', 'labelPlural', 'labelIdentifierFieldMetadataUniversalIdentifier']) {
      if (!new RegExp(`\\b${key}\\s*:`).test(text)) problems.push(`${rel(file)} lacks ${key}`);
    }
  }
  if (objectFiles.length !== EXPECTED_OBJECTS.length) {
    fail(`expected ${EXPECTED_OBJECTS.length} custom object files, found ${objectFiles.length}`);
  }
  if (problems.length) fail(problems.join('; '));
  else ok(`${objectFiles.length} custom objects (${EXPECTED_OBJECTS.join(', ')}) declare names, labels and a label identifier`);
}

// ----------------------------------------------------------- 4. stage set
{
  const { OPPORTUNITY_STAGES, DEFAULT_OPPORTUNITY_STAGE } = await import(pathToFileURL(join(ROOT, 'shared/stages.mjs')).href);
  const labels = OPPORTUNITY_STAGES.map((s) => s.label);
  if (JSON.stringify(labels) !== JSON.stringify(REQUIRED_STAGES)) {
    fail(`shared/stages.mjs labels are [${labels.join(', ')}], expected [${REQUIRED_STAGES.join(', ')}]`);
  } else ok(`Opportunity stages: ${labels.join(' → ')}`);
  const positions = OPPORTUNITY_STAGES.map((s) => s.position);
  if (positions.some((p, i) => p !== i)) fail('shared/stages.mjs positions are not 0..n-1 in order');
  if (!OPPORTUNITY_STAGES.some((s) => s.value === DEFAULT_OPPORTUNITY_STAGE)) fail('DEFAULT_OPPORTUNITY_STAGE is not one of the stages');

  const pipeline = read('src/views/pipeline-kanban.view.ts');
  if (!/OPPORTUNITY_STAGES\.map\(/.test(pipeline)) fail('pipeline-kanban.view.ts does not build its groups from OPPORTUNITY_STAGES');
  if (!/type:\s*ViewType\.KANBAN/.test(pipeline)) fail('pipeline-kanban.view.ts is not a KANBAN view');
  if (!/STANDARD\.opportunity\.fields\.stage/.test(pipeline)) fail('pipeline-kanban.view.ts does not group by the standard stage field');
  const name = /name:\s*'([^']*)'/.exec(pipeline)?.[1] ?? '';
  if (!/pipeline|by stage/i.test(name)) fail(`Pipeline view name "${name}" would not be found by the e2e (/pipeline|by stage|kanban/i)`);
  else ok(`Pipeline kanban named "${name}", grouped by standard stage, columns from shared/stages.mjs`);
}

// ---------------------------------------------------------- 5. test ids
{
  const checks = [
    ['src/front-components/RenewalBanner.tsx', 'renewal-banner'],
    ['src/front-components/RenewalCountWidget.tsx', 'renewal-count-widget'],
  ];
  for (const [file, id] of checks) {
    const text = read(file);
    if (!text.includes(`data-testid="${id}"`)) fail(`${file} lacks data-testid="${id}"`);
    else ok(`${file}: data-testid="${id}"`);
  }
  const widget = read('src/front-components/RenewalCountWidget.tsx');
  if (!/Renewals &lt; \{DUE_WINDOW_DAYS\} days|Renewals < 90 days/.test(widget)) fail('RenewalCountWidget lacks the "Renewals < 90 days" title fallback');
}

// -------------------------------------------------- 6. company labels
{
  const company = Object.entries(sources)
    .filter(([f]) => f.startsWith(join(SRC, 'objects', 'company') + '/'))
    .map(([, text]) => text)
    .join('\n');
  const labels = [...company.matchAll(/label:\s*'([^']*)'/g)].map((m) => m[1]);
  const missing = REQUIRED_COMPANY_LABELS.filter((want) => !labels.some((l) => l === want || l.startsWith(`${want} `)));
  if (missing.length) fail(`src/objects/company/ labels missing (English-first): ${missing.join(', ')}`);
  else ok(`Company labels findable by English text: ${REQUIRED_COMPANY_LABELS.join(', ')}`);
  const tooLong = labels.filter((l) => l.length > 63);
  if (tooLong.length) fail(`src/objects/company/ labels over 63 chars: ${tooLong.join(' | ')}`);
}

// ------------------------------------------------ 7. tokens, not hexes
{
  const problems = [];
  for (const [file, text] of Object.entries(sources)) {
    if (!/front-components\/|lib\/theme\.ts$/.test(file)) continue;
    for (const m of text.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
      const hex = `#${m[1].toLowerCase()}`;
      const line = text.slice(0, m.index).split('\n').length;
      const lineText = text.split('\n')[line - 1];
      if (/^\s*(\/\/|\*|\/\*)/.test(lineText)) continue; // comment
      if (!ALLOWED_HEX.has(hex)) problems.push(`${rel(file)}:${line} ${hex}`);
      else if (!/var\(--t-[^)]*,\s*#/.test(lineText)) problems.push(`${rel(file)}:${line} ${hex} not used as a var() fallback`);
    }
    if (!/var\(--t-/.test(text)) problems.push(`${rel(file)} uses no --t-* tokens`);
  }
  if (problems.length) fail(`front components must use --t-* tokens: ${problems.join('; ')}`);
  else ok('front components use --t-* tokens; only #C5A059/#775A19 appear, as var() fallbacks');
}

// ------------------------------------------------- 8. urgency maths
{
  const u = await import(pathToFileURL(join(ROOT, 'shared/urgency.mjs')).href);
  const today = new Date('2026-09-18T12:00:00Z');
  const cases = [
    ['2026-09-17', 'OVERDUE'],
    ['2026-09-18', 'DUE'],
    ['2026-12-16', 'DUE'], // 89 days
    ['2026-12-17', 'WATCH'], // 90 days
    ['2027-03-17', 'WATCH'], // 180 days
    ['2027-03-18', 'NONE'], // 181 days
    [null, 'NONE'],
  ];
  const wrong = cases.filter(([d, want]) => u.urgencyForDate(d, today) !== want).map(([d, want]) => `${d} → ${u.urgencyForDate(d, today)} (want ${want})`);
  if (wrong.length) fail(`shared/urgency.mjs windows: ${wrong.join('; ')}`);
  const line = u.renewalLine('2027-03-14', today);
  if (line !== 'Renews 14 Mar 2027 · 177 days') fail(`renewalLine formatting: "${line}"`);
  if (u.nextStatus('ACTIVE', 'DUE') !== 'EXPIRING' || u.nextStatus('SIGNED', 'DUE') !== 'SIGNED' || u.nextStatus('ACTIVE', 'WATCH') !== 'ACTIVE') {
    fail('nextStatus: only ACTIVE→EXPIRING inside the 90-day window is allowed');
  }
  if (!wrong.length) ok(`urgency windows NONE>180 / WATCH 90–180 / DUE<90 / OVERDUE<0 verified; "${line}"`);
}

// ------------------------------------- 9. one default-exported define per file
{
  const problems = [];
  let entities = 0;
  for (const [file, raw] of Object.entries(sources)) {
    const text = stripComments(raw);
    const calls = [...text.matchAll(DEFINE_CALL)];
    if (calls.length === 0) continue;
    entities += 1;
    if (calls.length > 1) problems.push(`${rel(file)} has ${calls.length} define*() calls (one per file)`);
    else if (!/^export default define\w+\(\{/m.test(text)) problems.push(`${rel(file)} must \`export default ${calls[0][1]}({...})\``);
  }
  if (problems.length) fail(`not discoverable by the twenty-sdk manifest builder: ${problems.join('; ')}`);
  else ok(`${entities} entity files, each a single \`export default define*()\` (twenty-sdk builder form)`);
}

// ------------------------------------------- 10. E1 enquiries: kanban + freemail
{
  const kanban = read('src/views/enquiries-kanban.view.ts');
  if (!/ENQUIRY_STATUS\.map\(/.test(kanban)) fail('enquiries-kanban.view.ts does not build its groups from ENQUIRY_STATUS');
  if (!/mainGroupByFieldMetadataUniversalIdentifier:\s*E\.status/.test(kanban)) fail('enquiries-kanban.view.ts does not group by Enquiry.status');

  const icp = await import(pathToFileURL(join(ROOT, 'shared/icp.mjs')).href);
  const cases = [
    ['li.wei@acme-battery.cn', 'acme-battery.cn'],
    ['Someone@QQ.com', null],
    ['x@163.com', null],
    ['x@gmail.com', null],
    ['not-an-email', null],
  ];
  const wrong = cases
    .filter(([email, want]) => icp.companyDomainForEmail(email) !== want)
    .map(([email, want]) => `${email} → ${icp.companyDomainForEmail(email)} (want ${want})`);
  const hosts = [
    ['https://www.acme-battery.cn/en', 'acme-battery.cn', true],
    ['acme-battery.cn', 'acme-battery.cn', true],
    ['https://eu.acme-battery.cn', 'acme-battery.cn', true],
    ['https://notacme-battery.cn', 'acme-battery.cn', false],
  ];
  for (const [url, domain, want] of hosts) {
    if (icp.hostMatchesDomain(url, domain) !== want) wrong.push(`hostMatchesDomain(${url}, ${domain}) !== ${want}`);
  }
  if (wrong.length) fail(`shared/icp.mjs: ${wrong.join('; ')}`);
  else ok(`Enquiry inbox kanban grouped by status from ENQUIRY_STATUS; freemail domains (${icp.FREEMAIL_DOMAINS.length}) never match a Company`);
}

// ------------------------------------- 11. B1 streams + A1 fair-lead scoring
{
  const problems = [];
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

  const optionsSource = read('src/options.ts');
  const categoryBlock = /export const PRODUCT_CATEGORY = options\(\[([\s\S]*?)\]\);/.exec(optionsSource)?.[1] ?? '';
  const categories = [...categoryBlock.matchAll(/\['([A-Z_]+)',/g)].map((m) => m[1]);
  if (categories.length === 0) problems.push('could not read PRODUCT_CATEGORY from src/options.ts');

  const { PRODUCT_STREAMS } = await import(pathToFileURL(join(ROOT, 'shared/streams.mjs')).href);
  if (!same(PRODUCT_STREAMS.map((s) => s.category), categories)) {
    problems.push(`shared/streams.mjs categories [${PRODUCT_STREAMS.map((s) => s.category).join(', ')}] ≠ PRODUCT_CATEGORY [${categories.join(', ')}]`);
  }
  const slugs = PRODUCT_STREAMS.map((s) => s.slug);
  if (new Set(slugs).size !== slugs.length) problems.push('shared/streams.mjs: duplicate slugs');
  if (slugs.some((s) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s))) problems.push('shared/streams.mjs: slugs must be kebab-case');
  if (PRODUCT_STREAMS.some((s, i) => s.sortOrder !== i)) problems.push('shared/streams.mjs: sortOrder is not 0..n-1 in order');

  const intake = read('src/functions/fair-lead-intake.ts');
  const intakeBlock = /const ProductCategory = z\.enum\(\[([\s\S]*?)\]\)/.exec(intake)?.[1] ?? '';
  const intakeValues = [...intakeBlock.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
  if (!same(intakeValues, categories)) problems.push(`fair-lead-intake.ts ProductCategory [${intakeValues.join(', ')}] ≠ PRODUCT_CATEGORY`);

  const scoring = await import(pathToFileURL(join(ROOT, 'shared/scoring.mjs')).href);
  if (!same(Object.keys(scoring.PRODUCT_INTEREST_POINTS), categories)) problems.push('shared/scoring.mjs PRODUCT_INTEREST_POINTS keys ≠ PRODUCT_CATEGORY');
  const cases = [
    [{ productInterest: ['TEXTILES', 'BATTERY_LI_ION'], email: 'wei@acme-battery.cn', phone: '+86 138', companyName: 'Acme' }, 65],
    [{ productInterest: ['MEDICAL_DEVICES'], email: 'a@qq.com', companyId: 'c1' }, 40],
    [{ productInterest: ['BATTERY_LMT'], email: 'a@gmail.com', phone: '  ' }, 20],
    [{ productInterest: [], email: 'not-an-email' }, 0],
  ];
  for (const [lead, want] of cases) {
    const { score } = scoring.scoreFairLead(lead);
    if (score !== want) problems.push(`scoreFairLead(${JSON.stringify(lead)}) = ${score}, want ${want}`);
  }

  const SYSTEM_FIELDS = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy', 'position', 'searchVector'];
  for (const [file, text] of Object.entries(sources).filter(([f]) => f.endsWith('.object.ts'))) {
    for (const m of text.matchAll(/\bname:\s*'([^']+)'/g)) {
      if (SYSTEM_FIELDS.includes(m[1])) problems.push(`${rel(file)} declares system field "${m[1]}"`);
    }
  }

  if (problems.length) fail(`B1/A1: ${problems.join('; ')}`);
  else ok(`${PRODUCT_STREAMS.length} product streams = PRODUCT_CATEGORY; intake + score weights cover them; ${cases.length} fair-lead score cases; no system-field redeclared`);
}

// ------------------------------------------------------------ 12. C1 pricing
{
  const problems = [];
  const p = await import(pathToFileURL(join(ROOT, 'shared/pricing.mjs')).href);
  const values = (rows) => rows.map((r) => r.value);

  // D3 display rules.
  const D3 = {
    ADD_ON: 'SHOW_FROM_PRICE',
    FLAT: 'SHOW_EXACT_TOTAL',
    TIERED: 'SHOW_PER_OPTION',
    BUNDLE: 'SHOW_PER_OPTION',
    QUOTE_ONLY: 'HIDE',
    CUSTOM: 'HIDE',
  };
  for (const [type, mode] of Object.entries(D3)) {
    if (p.DISPLAY_MODE_FOR_TYPE[type] !== mode) problems.push(`D3: ${type} → ${p.DISPLAY_MODE_FOR_TYPE[type]}, want ${mode}`);
  }
  const types = values(p.STRATEGY_TYPES);
  const modes = values(p.DISPLAY_MODES);
  const uncovered = types.filter((t) => !modes.includes(p.DISPLAY_MODE_FOR_TYPE[t]));
  if (uncovered.length) problems.push(`DISPLAY_MODE_FOR_TYPE lacks a valid mode for ${uncovered.join(', ')}`);

  const optionsSource = read('src/options.ts');
  const tierBlock = /export const TIER = options\(\[([\s\S]*?)\]\);/.exec(optionsSource)?.[1] ?? '';
  const tiers = [...tierBlock.matchAll(/\['([A-Z_]+)',/g)].map((m) => m[1]);
  if (JSON.stringify(values(p.PRICE_TIERS)) !== JSON.stringify(tiers)) {
    problems.push(`shared/pricing.mjs PRICE_TIERS [${values(p.PRICE_TIERS).join(', ')}] ≠ TIER [${tiers.join(', ')}]`);
  }

  // Seed: three four-tier ladders.
  const seed = p.PRICING_STRATEGIES;
  const allItems = seed.flatMap((s) => s.items);
  const keys = [...seed.map((s) => s.correlationId), ...allItems.map((i) => i.correlationId)];
  if (new Set(keys).size !== keys.length) problems.push('shared/pricing.mjs: duplicate correlationIds');
  if (keys.some((k) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(k))) problems.push('shared/pricing.mjs: correlationIds must be kebab-case');
  const lines = values(p.PRICE_PRODUCT_LINES);
  for (const s of seed) {
    if (!types.includes(s.strategyType)) problems.push(`${s.correlationId}: unknown strategyType ${s.strategyType}`);
    if (s.displayMode !== p.DISPLAY_MODE_FOR_TYPE[s.strategyType]) problems.push(`${s.correlationId}: displayMode ${s.displayMode} breaks D3`);
    if (JSON.stringify(s.items.map((i) => i.tier)) !== JSON.stringify(tiers)) problems.push(`${s.correlationId}: items are not one per tier in order`);
    for (const i of s.items) {
      if (!lines.includes(i.productLine)) problems.push(`${i.correlationId}: unknown productLine ${i.productLine}`);
      const boss = i.tier === 'BOSS';
      if (boss !== i.isOnRequest || boss !== (i.annualFeeEur === null)) {
        problems.push(`${i.correlationId}: Boss (and only Boss) must be on request with no fee`);
      }
    }
  }
  const fee = (line, tier) => allItems.find((i) => i.productLine === line && i.tier === tier)?.annualFeeEur;
  for (const tier of tiers.filter((t) => t !== 'BOSS')) {
    const want = Math.round((fee('DPP', tier) + fee('AR', tier)) * (1 - p.BUNDLE_DISCOUNT) * 100) / 100;
    if (fee('BUNDLE', tier) !== want) problems.push(`Bundle ${tier} = ${fee('BUNDLE', tier)}, want DPP + AR less ${p.BUNDLE_DISCOUNT * 100}% = ${want}`);
  }

  // Transform: seed as REST records, plus an inactive, an expired and a HIDE strategy.
  let n = 0;
  const strategies = [];
  const items = [];
  const add = (s, extra = {}) => {
    const id = `s${(n += 1)}`;
    strategies.push({ ...s, ...extra, id, description: { markdown: s.description, blocknote: null } });
    items.push(...s.items.map((i) => ({ ...i, id: `${id}-${i.correlationId}`, strategyId: id, description: 'internal' })));
  };
  seed.forEach((s) => add(s));
  add(seed[0], { correlationId: 'inactive', isActive: false });
  add(seed[0], { correlationId: 'expired', validUntil: '2026-06-30' });
  add(seed[0], { correlationId: 'quote', strategyType: 'QUOTE_ONLY', displayMode: null, sortOrder: 9 });
  const now = new Date('2026-10-04T12:00:00Z');
  const pub = p.buildPublicPricing(strategies.slice().reverse(), items, now);
  const ids = pub.strategies.map((s) => s.id);
  if (JSON.stringify(ids) !== JSON.stringify([...seed.map((s) => s.correlationId), 'quote'])) {
    problems.push(`published strategies [${ids.join(', ')}]: want live only, in sortOrder`);
  }
  if (pub.publishedAt !== now.toISOString()) problems.push('publishedAt is not the ISO timestamp');
  const STRATEGY_KEYS = ['id', 'name', 'type', 'description', 'displayMode', 'items'];
  const ITEM_KEYS = ['correlationId', 'name', 'tier', 'tierLabel', 'annualFeeEur', 'setupFeeEur', 'currency', 'isHighlighted', 'isOnRequest'];
  for (const s of pub.strategies) {
    if (JSON.stringify(Object.keys(s)) !== JSON.stringify(STRATEGY_KEYS)) problems.push(`strategy keys [${Object.keys(s)}]`);
    for (const i of s.items) {
      if (JSON.stringify(Object.keys(i)) !== JSON.stringify(ITEM_KEYS)) problems.push(`item keys [${Object.keys(i)}]`);
      if (i.isOnRequest && (i.annualFeeEur !== null || i.setupFeeEur !== null)) problems.push(`${i.correlationId}: on request but carries an amount`);
    }
  }
  const quote = pub.strategies.find((s) => s.id === 'quote');
  if (quote?.displayMode !== 'HIDE' || quote.items.some((i) => !i.isOnRequest)) problems.push('QUOTE_ONLY strategy not published as HIDE with every item on request');
  const dpp = pub.strategies[0];
  if (dpp?.description !== seed[0].description) problems.push('description not published as markdown');
  if (JSON.stringify(dpp?.items[0]) !== JSON.stringify({
    correlationId: 'dpp-beginner-2026', name: 'DPP Beginner', tier: 'BEGINNER', tierLabel: 'Beginner',
    annualFeeEur: 950, setupFeeEur: null, currency: 'EUR', isHighlighted: false, isOnRequest: false,
  })) problems.push(`dpp-beginner-2026 published as ${JSON.stringify(dpp?.items[0])}`);

  // Display copy.
  const priced = (displayMode) => ({ displayMode, items: [{ annualFeeEur: 2500, isOnRequest: false }, { annualFeeEur: 950, isOnRequest: false }, { annualFeeEur: null, isOnRequest: true }] });
  const copy = [
    [p.strategyHeadline(priced('SHOW_FROM_PRICE')), 'from €950'],
    [p.strategyHeadline(priced('SHOW_EXACT_TOTAL')), '€3,450/yr'],
    [p.strategyHeadline(priced('SHOW_PER_OPTION')), null],
    [p.strategyHeadline(priced('HIDE')), 'On request'],
    [p.strategyHeadline({ displayMode: 'SHOW_FROM_PRICE', items: [] }), 'On request'],
    [p.itemPriceLabel({ annualFeeEur: 1020, isOnRequest: false }), '€1,020/yr'],
    [p.itemPriceLabel({ annualFeeEur: 99.5, isOnRequest: false }), '€99.50/yr'],
    [p.itemPriceLabel({ annualFeeEur: null, isOnRequest: true }), 'On request'],
  ];
  for (const [got, want] of copy) if (got !== want) problems.push(`display copy "${got}", want "${want}"`);

  if (problems.length) fail(`C1 pricing: ${problems.join('; ')}`);
  else ok(`C1 pricing: D3 rules for ${types.length} strategy types; ${seed.length}×${tiers.length} seed items (Boss on request, Bundle −${p.BUNDLE_DISCOUNT * 100}%); pricing.json filters live/public/on-request; ${copy.length} display-copy cases`);
}

// ----------------------------------------------------------------- report
for (const p of passes) console.log(`✓ ${p}`);
for (const f of failures) console.log(`✗ ${f}`);
console.log(failures.length ? `\n${failures.length} check(s) FAILED` : `\nall ${passes.length} checks passed`);
process.exit(failures.length ? 1 : 0);
