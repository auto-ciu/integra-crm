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
 *  13. E2 reply templates: the seed is one template per category × EN/ZH
 *      (catch-all = ALL), its option values match the ReplyTemplate selects,
 *      the subject placeholders are only {{reference}}, and selectTemplate
 *      falls back exact → ALL category → ALL language.
 *  14. B2 digests + renewals: the per-call worst case keeps a run over every
 *      stream under the $10 session cap, regulation numbers are recognised,
 *      and planMandate never flips status on a mandate without a date.
 *  15. A2 lead discovery: one pinned company-page actor, no cookies anywhere,
 *      person profiles never pass as company pages, an Apify item maps to the
 *      expected DiscoveredCompany, the run cap holds, the off switch defaults
 *      to off, and the score rules give the expected scores.
 *  16. X5 training: the three seed events use real option values, a past
 *      event is closed, and the registration statuses are as specified.
 *  17. C2 Stripe sync: the pricing seed maps to Stripe products and prices
 *      (EUR cents, on-request and HIDE skipped, metadata), the plan is
 *      idempotent, and the webhook signature check accepts only a valid one.
 *  18. C3 portal sync: the event types and sources are as specified, only a
 *      purchase or renewal touches the pipeline, and on the Subscribed stage.
 *  19. D1-D2 research: one prompt per researchable product category, the
 *      prompt builder, and the BLOCKED answer while there is no API key.
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
  'ReplyTemplate',
  'LeadDiscoveryRun', 'DiscoveredCompany',
  'TrainingRegistration',
  'CustomerEvent', 'ResearchBrief',
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
    fail('nextStatus: ACTIVE→EXPIRING only inside the 90-day window');
  }
  if (u.nextStatus('EXPIRING', 'WATCH') !== 'ACTIVE' || u.nextStatus('EXPIRING', 'OVERDUE') !== 'EXPIRING' || u.nextStatus('LAPSED', 'NONE') !== 'LAPSED') {
    fail('nextStatus: EXPIRING→ACTIVE only once the renewal date leaves the 90-day window');
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

// ------------------------------------------------------- 13. E2 reply templates
{
  const problems = [];
  const r = await import(pathToFileURL(join(ROOT, 'shared/reply-templates.mjs')).href);
  const optionsSource = read('src/options.ts');
  const optionValues = (name) => {
    const block = new RegExp(`export const ${name} = options\\(\\[([\\s\\S]*?)\\]\\);`).exec(optionsSource)?.[1] ?? '';
    return [...block.matchAll(/\['([A-Z_]+)',/g)].map((m) => m[1]);
  };
  const enquiryCategories = optionValues('ENQUIRY_CATEGORY');
  if (JSON.stringify(optionValues('REPLY_TEMPLATE_CATEGORY')) !== JSON.stringify([...enquiryCategories, 'ALL'])) {
    problems.push('REPLY_TEMPLATE_CATEGORY must be ENQUIRY_CATEGORY + ALL');
  }
  if (JSON.stringify(optionValues('REPLY_TEMPLATE_LANGUAGE')) !== JSON.stringify([...optionValues('ENQUIRY_LANGUAGE'), 'ALL'])) {
    problems.push('REPLY_TEMPLATE_LANGUAGE must be ENQUIRY_LANGUAGE + ALL');
  }
  if (JSON.stringify(r.REPLY_TEMPLATE_CATEGORIES) !== JSON.stringify([...enquiryCategories, 'ALL'])) {
    problems.push('shared/reply-templates.mjs REPLY_TEMPLATE_CATEGORIES ≠ REPLY_TEMPLATE_CATEGORY');
  }

  const seed = r.REPLY_TEMPLATES;
  const names = seed.map((t) => t.name);
  if (new Set(names).size !== names.length) problems.push('reply template seed: duplicate names');
  if (seed.length !== 10) problems.push(`reply template seed has ${seed.length} templates, want 10`);
  const seededCategories = ['DPP', 'AR', 'TRAINING', 'AUTHORITIES', 'ALL'];
  for (const category of seededCategories) {
    for (const language of ['EN', 'ZH']) {
      if (seed.filter((t) => t.category === category && t.language === language).length !== 1) {
        problems.push(`reply template seed: want exactly one ${category}/${language}`);
      }
    }
  }
  for (const t of seed) {
    const used = (text) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]);
    if (!used(t.subject).includes('reference') || used(t.subject).some((k) => k !== 'reference')) problems.push(`${t.name}: subject must use {{reference}} only`);
    const unknown = used(t.body).filter((k) => !r.PLACEHOLDERS.includes(k));
    if (unknown.length) problems.push(`${t.name}: unknown body placeholders ${unknown.join(', ')}`);
  }
  // Every enquiry category × language gets a reply in its own language.
  for (const category of enquiryCategories) {
    for (const language of ['EN', 'ZH']) {
      const picked = r.selectTemplate(seed, { category, language });
      if (!picked || picked.language !== language) problems.push(`no ${language} reply for ${category}`);
    }
  }

  // Fallback order: exact → ALL category → ALL language → ALL/ALL; inactive ignored; sortOrder breaks ties.
  const T = (name, category, language, extra = {}) => ({ id: name, name, category, language, isActive: true, sortOrder: 0, ...extra });
  const pool = [T('allall', 'ALL', 'ALL'), T('dpp-all', 'DPP', 'ALL'), T('all-zh', 'ALL', 'ZH'), T('dpp-zh', 'DPP', 'ZH'), T('dpp-zh-off', 'DPP', 'ZH', { isActive: false, sortOrder: -1 })];
  const pick = (templates, category, language) => r.selectTemplate(templates, { category, language })?.id ?? null;
  const cases = [
    [pool, 'DPP', 'ZH', 'dpp-zh'],
    [pool.filter((t) => t.id !== 'dpp-zh'), 'DPP', 'ZH', 'all-zh'],
    [pool.filter((t) => !['dpp-zh', 'all-zh'].includes(t.id)), 'DPP', 'ZH', 'dpp-all'],
    [pool, 'AR', 'EN', 'allall'],
    [[T('ar-en', 'AR', 'EN')], 'DPP', 'EN', null],
    [[T('b', 'DPP', 'EN', { sortOrder: 2 }), T('a', 'DPP', 'EN', { sortOrder: 1 })], 'DPP', 'EN', 'a'],
  ];
  for (const [templates, category, language, want] of cases) {
    const got = pick(templates, category, language);
    if (got !== want) problems.push(`selectTemplate(${category}/${language}) = ${got}, want ${want}`);
  }

  const values = r.templateValues({ reference: 'ENQ-261004-AB2C', name: '  Li\nWei ', company: '', category: 'AR', language: 'ZH' });
  const rendered = r.renderTemplate('{{name}}|{{company}}|{{category}}|{{reference}}|{{unknown}}', values);
  if (rendered !== 'Li Wei|贵公司|欧盟授权代表服务|ENQ-261004-AB2C|{{unknown}}') problems.push(`renderTemplate: "${rendered}"`);

  if (problems.length) fail(`E2 reply templates: ${problems.join('; ')}`);
  else ok(`E2 reply templates: ${seed.length} seeds (${seededCategories.length} categories × EN/ZH, catch-all ALL); every enquiry category answered in its language; ${cases.length} fallback cases; rendering`);
}

// ------------------------------------------------------ 14. B2 digests + renewals
{
  const problems = [];
  const d = await import(pathToFileURL(join(ROOT, 'shared/digest.mjs')).href);
  const { PRODUCT_STREAMS } = await import(pathToFileURL(join(ROOT, 'shared/streams.mjs')).href);

  if (d.SESSION_BUDGET_USD !== 10) problems.push(`SESSION_BUDGET_USD is ${d.SESSION_BUDGET_USD}, the plan says $10`);
  // A full run at the prompt ceiling, every call using all of max_tokens at fallback prices, still fits.
  const fullRun = PRODUCT_STREAMS.length * d.worstCaseCostUsd(d.DIGEST_MAX_INPUT_TOKENS);
  if (fullRun > d.SESSION_BUDGET_USD) problems.push(`worst-case run over ${PRODUCT_STREAMS.length} streams is $${fullRun}, over the cap`);
  if (d.maxInputTokens(d.SESSION_BUDGET_USD) !== d.DIGEST_MAX_INPUT_TOKENS) problems.push('a full budget should allow the prompt ceiling');
  if (d.maxInputTokens(d.worstCaseCostUsd(0)) !== 0 || d.maxInputTokens(0.5) !== 0) problems.push('maxInputTokens must be 0 when max_tokens alone does not fit');
  if (d.maxInputTokens(d.worstCaseCostUsd(1000)) !== 1000) problems.push(`maxInputTokens(worstCase(1000)) = ${d.maxInputTokens(d.worstCaseCostUsd(1000))}`);
  const cost = d.costUsd('claude-opus-5-5', { input_tokens: 1000, output_tokens: 5000 });
  if (cost !== 0.104) problems.push(`costUsd(opus 5.5, 1k in / 5k out) = ${cost}, want 0.104`);
  if (d.costUsd('some-future-model', { input_tokens: 1e6, output_tokens: 0 }) !== d.UNKNOWN_MODEL_PRICE.input) problems.push('unknown models must be costed at UNKNOWN_MODEL_PRICE');

  const numbers = [
    ['Regulation (EU) 2023/1542', '2023/1542'],
    ['(EC) No 1907/2006', '1907/2006'],
    ['Directive 2001/95/EC', '2001/95'],
    ['Regulation (EC) No 765/2008', '765/2008'],
    ['the Battery Regulation', null],
    ['', null],
  ];
  for (const [text, want] of numbers) if (d.regulationNumber(text) !== want) problems.push(`regulationNumber("${text}") = ${d.regulationNumber(text)}, want ${want}`);

  const u = await import(pathToFileURL(join(ROOT, 'shared/urgency.mjs')).href);
  const today = new Date('2026-10-04T12:00:00Z');
  const plans = [
    [{ status: 'ACTIVE', urgency: 'WATCH', renewalDate: '2026-12-01' }, { urgency: 'DUE', status: 'EXPIRING' }],
    [{ status: 'EXPIRING', urgency: 'DUE', renewalDate: '2027-09-01' }, { urgency: 'NONE', status: 'ACTIVE' }],
    [{ status: 'EXPIRING', urgency: 'DUE', renewalDate: null }, { urgency: 'NONE' }],
    [{ status: 'EXPIRING', urgency: 'OVERDUE', renewalDate: '2026-10-01' }, {}],
  ];
  for (const [mandate, want] of plans) {
    const { patch } = u.planMandate(mandate, today);
    if (JSON.stringify(patch) !== JSON.stringify(want)) problems.push(`planMandate(${JSON.stringify(mandate)}) patch ${JSON.stringify(patch)}, want ${JSON.stringify(want)}`);
  }

  if (problems.length) fail(`B2/renewals: ${problems.join('; ')}`);
  else ok(`B2 digests: worst-case run over ${PRODUCT_STREAMS.length} streams $${fullRun.toFixed(2)} ≤ $${d.SESSION_BUDGET_USD} cap; ${numbers.length} regulation-number cases. Renewals: ${plans.length} planMandate cases`);
}

// --------------------------------------------------------- 15. A2 lead discovery
{
  const problems = [];
  const d = await import(pathToFileURL(join(ROOT, 'shared/lead-discovery.mjs')).href);
  const optionsSource = read('src/options.ts');
  const optionValues = (name) => {
    const block = new RegExp(`export const ${name} = options\\(\\[([\\s\\S]*?)\\]\\);`).exec(optionsSource)?.[1] ?? '';
    return [...block.matchAll(/\['([A-Z_]+)',/g)].map((m) => m[1]);
  };
  const categories = optionValues('PRODUCT_CATEGORY');
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

  // Guardrails (a), (b), (f), (g).
  if (d.APIFY_ACTOR !== 'harvestapi/linkedin-company') problems.push(`APIFY_ACTOR is ${d.APIFY_ACTOR}; only the company-page actor is approved`);
  if (!/^\d+\.\d+\.\d+$/.test(d.APIFY_ACTOR_BUILD)) problems.push(`APIFY_ACTOR_BUILD "${d.APIFY_ACTOR_BUILD}" is not a pinned build number`);
  for (const [file, text] of Object.entries(sources)) {
    if (/cookie/i.test(stripComments(text))) problems.push(`${rel(file)} mentions cookies (guardrail b: no-cookie actors only)`);
    for (const m of stripComments(text).matchAll(/\/acts\/([\w~.-]+)/g)) problems.push(`${rel(file)} calls actor ${m[1]} directly`);
  }
  if (d.isApifyEnabled({}) || d.isApifyEnabled({ APIFY_ENABLED: '1' }) || !d.isApifyEnabled({ APIFY_ENABLED: 'true' })) {
    problems.push('isApifyEnabled: only APIFY_ENABLED=true may switch Apify on');
  }
  if (d.estimateCostUsd(d.MAX_RESULTS_PER_RUN) > d.RUN_SPEND_CEILING_USD) problems.push('a full run (MAX_RESULTS_PER_RUN) does not fit under RUN_SPEND_CEILING_USD');
  if (d.estimateCostUsd(100) !== 0.4005) problems.push(`estimateCostUsd(100) = ${d.estimateCostUsd(100)}, want 0.4005`);

  const urls = [
    ['https://www.linkedin.com/company/Acme-Battery/?trk=x', 'https://www.linkedin.com/company/acme-battery'],
    ['linkedin.com/company/acme-battery/about', 'https://www.linkedin.com/company/acme-battery'],
    ['https://cn.linkedin.com/showcase/acme-energy', 'https://www.linkedin.com/showcase/acme-energy'],
    ['https://www.linkedin.com/in/li-wei-12345', null],
    ['https://www.linkedin.com/pub/li-wei/1/2/3', null],
    ['https://www.linkedin.com/school/tsinghua', null],
    ['https://linkedin.com.evil.example/company/acme', null],
    ['', null],
  ];
  for (const [url, want] of urls) if (d.companyPageUrl(url) !== want) problems.push(`companyPageUrl(${url}) = ${d.companyPageUrl(url)}, want ${want}`);

  // Item mapping.
  const item = {
    linkedinUrl: 'https://www.linkedin.com/company/acme-battery/',
    name: 'Acme Battery Co., Ltd.',
    tagline: 'LiFePO4 cells for Europe',
    website: 'https://www.acme-battery.cn/en?utm_source=linkedin',
    industries: ['Battery Manufacturing'],
    specialities: ['energy storage', 'e-bike packs'],
    employeeCountRange: { start: 201, end: 500 },
    locations: [
      { headquarter: false, parsed: { city: 'Rotterdam', country: 'Netherlands' } },
      { headquarter: true, city: 'Shenzhen', parsed: { city: 'Shenzhen', state: 'Guangdong', country: 'China' } },
    ],
    phone: '+86 755 0000 0000',
  };
  const mapped = d.mapApifyItem(item, 'RUN1');
  const r = mapped.ok ? mapped.record : {};
  const want = {
    companyName: 'Acme Battery Co., Ltd.',
    website: 'https://www.acme-battery.cn',
    linkedinUrl: 'https://www.linkedin.com/company/acme-battery',
    industry: 'Battery Manufacturing',
    companySize: '201-500',
    headquarters: 'Shenzhen, Guangdong, China',
    productCategories: ['BATTERY_LI_ION', 'BATTERY_LMT'],
  };
  for (const [k, v] of Object.entries(want)) if (JSON.stringify(r[k]) !== JSON.stringify(v)) problems.push(`mapApifyItem ${k} = ${JSON.stringify(r[k])}, want ${JSON.stringify(v)}`);
  if (!String(r.description ?? '').includes('build') || !String(r.description ?? '').includes('RUN1')) problems.push('mapApifyItem: description lacks provenance (actor build + run)');
  if ('phone' in r) problems.push('mapApifyItem copies a phone number; discovery keeps company data only');
  const dropped = [
    [{ ...item, linkedinUrl: 'https://www.linkedin.com/in/li-wei' }, 'not_company_page'],
    [{ ...item, website: '' }, 'no_website'],
  ];
  for (const [x, reason] of dropped) {
    const m = d.mapApifyItem(x);
    if (m.ok || m.reason !== reason) problems.push(`mapApifyItem should drop ${reason}, got ${JSON.stringify(m.ok ? 'ok' : m.reason)}`);
  }
  if (d.companySizeText({ employeeCount: 87 }) !== '51-200' || d.companySizeText({ employeeCountRange: { start: 10001 } }) !== '10001+') {
    problems.push('companySizeText bands');
  }
  for (const c of d.categoriesFromText(['medical devices', 'consumer electronics'])) if (!categories.includes(c)) problems.push(`categoriesFromText → unknown ${c}`);

  // Cost of a finished pay-per-event run (tiered price counts at its dearest tier).
  const run = {
    chargedEventCounts: { 'apify-actor-start': 1, 'apify-default-dataset-item': 40 },
    pricingInfo: { pricingPerEvent: { actorChargeEvents: {
      'apify-actor-start': { eventPriceUsd: 0.00005 },
      'apify-default-dataset-item': { eventTieredPricingUsd: { FREE: { tieredEventPriceUsd: 0.004 }, GOLD: { tieredEventPriceUsd: 0.003 } } },
    } } },
  };
  if (d.runCostUsd(run) !== 0.16005) problems.push(`runCostUsd(PPE run) = ${d.runCostUsd(run)}, want 0.16005`);
  if (d.runCostUsd({ usageTotalUsd: 0.12 }) !== 0.12 || d.runCostUsd({}, 10) !== 0.04) problems.push('runCostUsd fallbacks');

  // Score rules.
  if (!same(Object.keys(d.CATEGORY_POINTS), categories)) problems.push('shared/lead-discovery.mjs CATEGORY_POINTS keys ≠ PRODUCT_CATEGORY');
  if (Object.keys(d.CATEGORY_KEYWORDS).some((k) => !categories.includes(k))) problems.push('CATEGORY_KEYWORDS has a key that is not a PRODUCT_CATEGORY');
  if (Math.max(...Object.values(d.CATEGORY_POINTS)) !== 40) problems.push('product category must be worth up to 40');
  const scores = [
    [r, 85],
    [{ ...r, emailDomains: 'acme-battery.cn, qq.com' }, 100],
    [{ productCategories: ['TEXTILES'], website: 'https://x.cn', linkedinUrl: null, emailDomains: '163.com', companySize: '11-50', headquarters: 'Hong Kong', industry: 'Textile Manufacturing' }, 30],
    [{ productCategories: ['ELECTRONICS'], website: 'https://x.cn', linkedinUrl: 'https://www.linkedin.com/company/x', companySize: '51-200', headquarters: 'Ningbo, Zhejiang, China', industry: 'Appliances' }, 55],
    [{}, 0],
  ];
  for (const [c, wantScore] of scores) {
    const { score } = d.scoreDiscoveredCompany(c);
    if (score !== wantScore) problems.push(`scoreDiscoveredCompany(${JSON.stringify(c).slice(0, 80)}…) = ${score}, want ${wantScore}`);
  }

  if (problems.length) fail(`A2 lead discovery: ${problems.join('; ')}`);
  else ok(`A2 lead discovery: ${d.APIFY_ACTOR}@${d.APIFY_ACTOR_BUILD} only, no cookies, off unless APIFY_ENABLED=true; ${urls.length} company-page URL cases; item mapping + provenance; run cap $${d.RUN_SPEND_CEILING_USD}; ${scores.length} score cases`);
}

// ------------------------------------------------------------ 16. X5 training
{
  const problems = [];
  const t = await import(pathToFileURL(join(ROOT, 'shared/training.mjs')).href);
  const optionsSource = read('src/options.ts');
  const optionValues = (name) => {
    const block = new RegExp(`export const ${name} = options\\(\\[([\\s\\S]*?)\\]\\);`).exec(optionsSource)?.[1] ?? '';
    return [...block.matchAll(/\['([A-Z_]+)',/g)].map((m) => m[1]);
  };
  const channels = optionValues('TRAINING_CHANNEL');
  const languages = optionValues('LANGUAGE');
  const statuses = optionValues('TRAINING_REGISTRATION_STATUS');
  if (JSON.stringify(statuses) !== JSON.stringify(['REGISTERED', 'CONFIRMED', 'ATTENDED', 'CANCELLED', 'NO_SHOW'])) {
    problems.push(`TRAINING_REGISTRATION_STATUS is [${statuses.join(', ')}]`);
  }
  const names = t.TRAINING_EVENTS.map((e) => e.name);
  if (t.TRAINING_EVENTS.length !== 3 || new Set(names).size !== 3) problems.push('want three uniquely named seed events');
  for (const e of t.TRAINING_EVENTS) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || Number.isNaN(Date.parse(e.date))) problems.push(`${e.name}: bad date ${e.date}`);
    if (!channels.includes(e.channel)) problems.push(`${e.name}: channel ${e.channel} is not a TRAINING_CHANNEL`);
    if (!languages.includes(e.language)) problems.push(`${e.name}: language ${e.language} is not a LANGUAGE`);
  }
  const now = new Date('2026-11-15T23:00:00Z');
  const passed = [['2026-11-14', true], ['2026-11-15', false], ['2026-11-16', false], [null, false], ['', false]];
  for (const [date, want] of passed) if (t.eventHasPassed(date, now) !== want) problems.push(`eventHasPassed(${date}) !== ${want}`);
  if (t.isActiveRegistration({ status: 'CANCELLED' }) || !t.isActiveRegistration({ status: 'NO_SHOW' })) problems.push('only CANCELLED frees a place');
  if (t.registrationName('DPP Compliance Masterclass', { firstName: 'Wei', lastName: 'Li' }) !== 'DPP Compliance Masterclass — Wei Li') problems.push('registrationName');

  if (problems.length) fail(`X5 training: ${problems.join('; ')}`);
  else ok(`X5 training: ${t.TRAINING_EVENTS.length} seed events (${names.join(' / ')}); ${passed.length} event-passed cases; statuses ${statuses.join('/')}`);
}

// ------------------------------------------------------------ 17. C2 Stripe sync
{
  const problems = [];
  const s = await import(pathToFileURL(join(ROOT, 'shared/stripe-sync.mjs')).href);
  const p = await import(pathToFileURL(join(ROOT, 'shared/pricing.mjs')).href);
  const today = '2026-06-01';

  // The seed as the CRM would return it: strategies with ids, items pointing at them.
  const strategies = p.PRICING_STRATEGIES.map(({ items, ...st }, i) => ({ ...st, id: `strategy-${i}` }));
  const items = p.PRICING_STRATEGIES.flatMap((st, i) => st.items.map((it) => ({ ...it, strategyId: `strategy-${i}` })));
  const plan = s.planSync(strategies, items, {}, today);
  if (plan.products.length !== 3 || plan.products.some((x) => !x.active)) problems.push('want three active products from the seed');
  if (plan.prices.length !== 9 || plan.skipped.length !== 3) problems.push(`seed → ${plan.prices.length} prices, ${plan.skipped.length} skipped; want 9 and 3 (the Boss rows)`);
  if (plan.skipped.some((x) => x.reason !== 'on_request')) problems.push('skipped rows must all be on_request');
  const beginner = plan.prices.find((x) => x.lookupKey === 'dpp-beginner-2026');
  if (!beginner || beginner.unitAmount !== 95000 || beginner.currency !== 'eur' || beginner.interval !== 'year' || beginner.productId !== 'dsp-2026') {
    problems.push(`dpp-beginner-2026 → ${JSON.stringify(beginner)}; want 95000 eur/year on product dsp-2026`);
  }
  if (beginner?.metadata.tier !== 'BEGINNER' || beginner?.metadata.displayMode !== 'SHOW_PER_OPTION' || 'highlighted' in (beginner?.metadata ?? {})) {
    problems.push('price metadata: tier and D3 displayMode set, highlighted only when highlighted');
  }
  if (s.toCents(19.99) !== 1999 || s.toCents(1020) !== 102000) problems.push('toCents rounds to whole cents');

  // Highlighted, on-request, hidden and inactive.
  const highlighted = items.map((it) => (it.correlationId === 'ar-boost-2026' ? { ...it, isHighlighted: true } : it));
  if (s.planSync(strategies, highlighted, {}, today).prices.find((x) => x.lookupKey === 'ar-boost-2026')?.metadata.highlighted !== 'true') problems.push('isHighlighted → metadata.highlighted "true"');
  const hidden = strategies.map((st) => (st.id === 'strategy-1' ? { ...st, displayMode: 'HIDE' } : st));
  const hiddenPlan = s.planSync(hidden, items, {}, today);
  if (hiddenPlan.products.find((x) => x.id === 'ar-2026')?.active !== false) problems.push('HIDE strategy → product active false');
  if (hiddenPlan.prices.some((x) => x.productId === 'ar-2026') || hiddenPlan.skipped.filter((x) => x.reason === 'strategy_hidden').length !== 4) problems.push('HIDE strategy → none of its items gets a price');
  const expired = strategies.map((st) => (st.id === 'strategy-2' ? { ...st, isActive: false } : st));
  if (s.planSync(expired, items, {}, today).products.length !== 2) problems.push('no filter syncs live strategies only');
  if (s.planSync(expired, items, { strategyId: 'strategy-2' }, today).products[0]?.active !== false) problems.push('an inactive strategy asked for by id → inactive product');

  // Filters.
  const one = s.planSync(strategies, items, { correlationIds: ['ar-builder-2026'] }, today);
  if (one.products.length !== 1 || one.prices.length !== 1 || one.prices[0].lookupKey !== 'ar-builder-2026') problems.push('an item correlationId syncs that item only');
  const whole = s.planSync(strategies, items, { correlationIds: ['ar-2026'] }, today);
  if (whole.products.length !== 1 || whole.prices.length !== 3) problems.push('a strategy correlationId syncs the strategy and its priced items');
  if (s.planSync(strategies, items, { strategyId: 'strategy-0' }, today).products[0].id !== 'dsp-2026') problems.push('strategyId filter');

  // Idempotency: the same input plans the same state, and a matching Stripe needs no write.
  if (JSON.stringify(s.planSync(strategies, items, {}, today)) !== JSON.stringify(plan)) problems.push('planSync is not deterministic');
  if (Object.keys(s.metadataPatch(beginner.metadata, { ...beginner.metadata }, s.PRICE_METADATA_KEYS)).length) problems.push('metadataPatch of identical metadata must be empty');
  const unset = s.metadataPatch({ correlationId: 'x' }, { correlationId: 'x', highlighted: 'true', other: 'kept' }, s.PRICE_METADATA_KEYS);
  if (JSON.stringify(unset) !== '{"highlighted":""}') problems.push(`metadataPatch should unset only a managed key that stopped applying, got ${JSON.stringify(unset)}`);

  // Mode from the key.
  for (const [key, want] of [['sk_test_abc123', 'test'], ['sk_live_abc123', 'live'], ['rk_live_abc123', 'live'], ['pk_test_abc', null], ['whsec_abc', null], ['', null], [undefined, null]]) {
    if (s.stripeMode(key) !== want) problems.push(`stripeMode(${key}) !== ${want}`);
  }

  // Webhook signature.
  const body = '{"id":"evt_1","type":"price.updated"}';
  const secret = 'whsec_test';
  const now = new Date('2026-06-01T12:00:00Z');
  const ts = Math.floor(now.getTime() / 1000);
  const header = s.signStripePayload(body, secret, ts);
  const sig = (b, h, sec = secret, at = now) => s.verifyStripeSignature(b, h, sec, at);
  if (!sig(body, header)) problems.push('a correctly signed payload must verify');
  if (sig(body + ' ', header)) problems.push('a changed body must not verify');
  if (sig(body, header, 'whsec_other')) problems.push('the wrong secret must not verify');
  if (sig(body, header, secret, new Date(now.getTime() + 6 * 60_000))) problems.push('a signature older than the tolerance must not verify');
  if (sig(body, undefined) || sig(body, 't=1,v1=') || sig(body, `t=${ts}`) || sig(body, `t=${ts},v1=zz`)) problems.push('a missing or malformed header must not verify');
  if (!sig(body, `t=${ts},v1=${'0'.repeat(64)},${header.split(',')[1]}`)) problems.push('any matching v1 among several verifies');

  // The sidecar never carries a key.
  for (const f of ['src/functions/sync-pricing-to-stripe.ts', 'src/functions/stripe-webhook.ts', 'src/functions/lib/stripe.ts', 'ops/sync-to-stripe.mjs', 'shared/stripe-sync.mjs']) {
    if (/\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{6,}|whsec_[A-Za-z0-9]{6,}/.test(read(f))) problems.push(`${f}: contains what looks like a Stripe secret`);
  }

  if (problems.length) fail(`C2 Stripe sync: ${problems.join('; ')}`);
  else ok(`C2 Stripe sync: seed → ${plan.products.length} products, ${plan.prices.length} prices (EUR cents, yearly), ${plan.skipped.length} on request skipped; HIDE/inactive/highlight/filter cases; idempotent plan + metadata patch; webhook signature accepts only a valid, fresh one`);
}

// ----------------------------------------------------------- 18. C3 portal sync
{
  const problems = [];
  const e = await import(pathToFileURL(join(ROOT, 'shared/portal-events.mjs')).href);
  const { OPPORTUNITY_STAGES } = await import(pathToFileURL(join(ROOT, 'shared/stages.mjs')).href);
  const types = e.CUSTOMER_EVENT_TYPES.map((t) => t.value);
  const sources = e.CUSTOMER_EVENT_SOURCES.map((t) => t.value);
  if (JSON.stringify(types) !== JSON.stringify(['PURCHASE', 'RENEWAL', 'CANCELLATION', 'UPGRADE', 'DOWNGRADE', 'SUPPORT', 'LOGIN'])) problems.push(`event types are [${types.join(', ')}]`);
  if (JSON.stringify(sources) !== JSON.stringify(['STRIPE', 'PORTAL', 'MANUAL'])) problems.push(`sources are [${sources.join(', ')}]`);
  const touching = types.filter((t) => e.touchesOpportunity(t));
  if (JSON.stringify(touching) !== JSON.stringify(['PURCHASE', 'RENEWAL'])) problems.push(`opportunity-touching events are [${touching.join(', ')}], want PURCHASE and RENEWAL`);
  const stages = OPPORTUNITY_STAGES.map((s) => s.value);
  if (!stages.includes(e.OPPORTUNITY_STAGE_ON_PAYMENT) || e.OPPORTUNITY_STAGE_ON_PAYMENT !== 'SUBSCRIBED') problems.push('a payment must land on the SUBSCRIBED stage');
  if (e.CLOSED_OPPORTUNITY_STAGES.some((x) => !stages.includes(x))) problems.push('CLOSED_OPPORTUNITY_STAGES has a value that is not a stage');
  if (e.CLOSED_OPPORTUNITY_STAGES.includes(e.OPPORTUNITY_STAGE_ON_PAYMENT)) problems.push('the payment stage cannot be a closed stage');
  for (const [v, want] of [['li.wei@acme-battery.cn', true], [' a@b.co ', true], ['Acme Battery Co.', false], ['a@b', false], ['', false], [undefined, false]]) {
    if (e.isEmail(v) !== want) problems.push(`isEmail(${JSON.stringify(v)}) !== ${want}`);
  }
  if (e.eventName('PURCHASE', ' Acme ') !== 'PURCHASE — Acme') problems.push('eventName');

  if (problems.length) fail(`C3 portal sync: ${problems.join('; ')}`);
  else ok(`C3 portal sync: ${types.length} event types, ${sources.length} sources; ${touching.join('/')} → ${e.OPPORTUNITY_STAGE_ON_PAYMENT}, ${e.CLOSED_OPPORTUNITY_STAGES.join('/')} never reopened`);
}

// ---------------------------------------------------------- 19. D1-D2 research
{
  const problems = [];
  const r = await import(pathToFileURL(join(ROOT, 'shared/research-prompts.mjs')).href);
  const { PRODUCT_STREAMS } = await import(pathToFileURL(join(ROOT, 'shared/streams.mjs')).href);
  const optionsSource = read('src/options.ts');
  const optionValues = (name) => {
    const block = new RegExp(`export const ${name} = options\\(\\[([\\s\\S]*?)\\]\\);`).exec(optionsSource)?.[1] ?? '';
    return [...block.matchAll(/\['([A-Z_]+)',/g)].map((m) => m[1]);
  };
  const categories = optionValues('PRODUCT_CATEGORY');
  const streamCategories = PRODUCT_STREAMS.map((s) => s.category);

  const want = ['BATTERY_LI_ION', 'BATTERY_LMT', 'TEXTILES', 'ELECTRONICS', 'FURNITURE', 'TOYS', 'MACHINERY', 'MEDICAL_DEVICES'];
  if (JSON.stringify(r.RESEARCH_TOPICS) !== JSON.stringify(want)) problems.push(`prompt topics are [${r.RESEARCH_TOPICS.join(', ')}]`);
  for (const t of r.RESEARCH_TOPICS) {
    if (!categories.includes(t) || !streamCategories.includes(t)) problems.push(`${t} is not a PRODUCT_CATEGORY with a stream`);
    if (r.RESEARCH_PROMPTS[t].trim().length < 60) problems.push(`${t}: prompt is empty or too short`);
  }
  const unresearched = streamCategories.filter((c) => !r.RESEARCH_TOPICS.includes(c));
  if (JSON.stringify(unresearched) !== '["OTHER"]') problems.push(`categories without a prompt: [${unresearched.join(', ')}], want only OTHER`);
  if (!r.RESEARCH_PROMPTS.MACHINERY.includes('2023/1230') || !r.RESEARCH_PROMPTS.BATTERY_LMT.includes('EN 50604-1')) problems.push('prompt text lost its regulation references');

  const depths = r.RESEARCH_DEPTHS.map((d) => d.value);
  const statuses = r.RESEARCH_STATUSES.map((d) => d.value);
  if (JSON.stringify(depths) !== '["OVERVIEW","DEEP_DIVE","COMPLIANCE_CHECK"]') problems.push(`depths are [${depths.join(', ')}]`);
  if (JSON.stringify(statuses) !== '["DRAFT","SUBMITTED","IN_PROGRESS","COMPLETED","FAILED"]') problems.push(`statuses are [${statuses.join(', ')}]`);
  if (JSON.stringify(Object.keys(r.DEPTH_INSTRUCTIONS)) !== JSON.stringify(depths)) problems.push('every depth needs an instruction');

  const built = r.researchPrompt({ topic: 'TOYS', scope: 'China', depth: 'DEEP_DIVE' });
  if (!built?.startsWith(r.RESEARCH_PROMPTS.TOYS) || !built.includes('Scope: China.') || !built.includes('deep dive')) problems.push('researchPrompt = topic prompt + scope + depth');
  if (r.researchPrompt({ topic: 'OTHER' }) !== null || r.researchPrompt({ topic: 'TOYS', depth: 'NOPE' }) !== null) problems.push('no prompt for OTHER or an unknown depth');
  if (!r.researchPrompt({ topic: 'TOYS' }).includes(`Scope: ${r.DEFAULT_RESEARCH_SCOPE}.`)) problems.push('default scope');

  // The skeleton is blocked without a key, and spends under the same cap as the digests.
  const fn = read('src/functions/run-research.ts');
  if (!fn.includes("'ANTHROPIC_API_KEY not configured'") || !fn.includes("status: 'BLOCKED'")) problems.push('run-research must answer BLOCKED / "ANTHROPIC_API_KEY not configured" without a key');
  if (!/maxInputTokens\(/.test(fn) || !/DIGEST_MAX_OUTPUT_TOKENS/.test(fn)) problems.push('run-research must apply the B2 digest cost cap');

  if (problems.length) fail(`D1-D2 research: ${problems.join('; ')}`);
  else ok(`D1-D2 research: ${r.RESEARCH_TOPICS.length} prompts on PRODUCT_CATEGORY topics (OTHER has none); ${depths.length} depths, ${statuses.length} statuses; prompt builder; run-research BLOCKED without a key, B2 cost cap`);
}

// ----------------------------------------------------------------- report
for (const p of passes) console.log(`✓ ${p}`);
for (const f of failures) console.log(`✗ ${f}`);
console.log(failures.length ? `\n${failures.length} check(s) FAILED` : `\nall ${passes.length} checks passed`);
process.exit(failures.length ? 1 : 0);
