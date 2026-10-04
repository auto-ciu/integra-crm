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
 *  12. C1 pricing: Offering / PricePoint / BundleItem / PricingPublication
 *      declare the plan's fields; shared/public-pricing.mjs D3 rules (display
 *      format per type, "from" prefix for ADD_ON / optional extras, no amounts
 *      for CTA / hidden / quote-only) cover every strategy type; the seed is
 *      the plan's eight offerings (Bundle = DPP + AR less the discount, Boss on
 *      request); buildPublicPricing publishes only live offerings, skips legacy
 *      price points, and its PublicPricingV1 output passes the schema, which
 *      rejects leaks and malformed documents.
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
 *      (EUR cents, on-request / legacy / per-seat / hidden skipped, metadata), the plan is
 *      idempotent, and the webhook signature check accepts only a valid one.
 *  18. C3 portal sync: the event types and sources are as specified, only a
 *      purchase or renewal touches the pipeline, and on the Subscribed stage.
 *  19. D1-D2 research (Claude Managed Agents): one prompt per researchable
 *      product category, the plan's fields and objects, research/agent.md, the
 *      pinned beta + $10 session budget, zod-validated ingest. Was: the
 *      prompt builder, and the BLOCKED answer while there is no API key.
 *
 *  20. F0.5: Person, Company and Opportunity have leadSource.
 *  21. A2 lead import + enrichment: LeadImport and the DiscoveredCompany A2
 *      fields exist, the import / enrichment / Safety Gate / GDPR Art.14
 *      functions exist with their budgets, dedupe keys, row mapping, risk
 *      levels and the Art.14 notice behave as specified.
 *
 * Exit 0 with a ✓ per check, or 1 listing every failure.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
  'Offering', 'PricePoint', 'BundleItem', 'PricingPublication',
  'ReplyTemplate',
  'LeadDiscoveryRun', 'DiscoveredCompany', 'LeadImport',
  'TrainingRegistration',
  'CustomerEvent', 'ResearchBrief', 'ResearchReport', 'ResearchFinding', 'Competitor', 'CompetitorPriceObservation',
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
  const p = await import(pathToFileURL(join(ROOT, 'shared/public-pricing.mjs')).href);
  const values = (rows) => rows.map((r) => r.value);

  // The old model is gone.
  for (const gone of ['shared/pricing.mjs', 'src/objects/price-item.object.ts', 'src/objects/pricing-strategy.object.ts', 'src/views/strategy-price-items.view.ts']) {
    if (existsSync(join(ROOT, gone))) problems.push(`${gone} must be deleted`);
  }

  // Object structure, from the source: every plan field is declared, by name.
  const PLAN_FIELDS = {
    'src/objects/offering.object.ts': ['name', 'offeringCode', 'productCategory', 'strategyType', 'displayFormat', 'fromPrefix', 'hasOptionalExtras', 'isActive', 'description', 'features', 'validFrom', 'validUntil', 'sortOrder', /* relation inverses: */ 'pricePoints', 'bundleItems', 'componentOf', 'competitorObservations'],
    'src/objects/price-point.object.ts': ['name', 'correlationId', 'offering', 'tier', 'annualFeeEur', 'setupFeeEur', 'currencyCode', 'isHighlighted', 'isOnRequest', 'isLegacy', 'sortOrder', 'description'],
    'src/objects/bundle-item.object.ts': ['name', 'bundle', 'component', 'included', 'sortOrder'],
    'src/objects/pricing-publication.object.ts': ['name', 'publishedAt', 'version', 'publishedBy', 'commitSha', 'isLive', 'notes'],
  };
  for (const [file, names] of Object.entries(PLAN_FIELDS)) {
    const src = stripComments(read(file));
    const declared = [...src.matchAll(/\bname: '([A-Za-z]+)',\s*\n\s*label:/g)].map((m) => m[1]);
    const missing = names.filter((n) => !declared.includes(n));
    const extra = declared.filter((n) => !names.includes(n));
    if (missing.length || extra.length) problems.push(`${file}: fields missing [${missing}] extra [${extra}] `);
  }
  const bundleSrc = read('src/objects/bundle-item.object.ts');
  if (!bundleSrc.includes('must be a BUNDLE strategyType offering') || !bundleSrc.includes('must be a non-BUNDLE offering')) problems.push('bundle-item: field descriptions must state the bundle / component rules');
  if (/\bname: 'currency'/.test(read('src/objects/price-point.object.ts'))) problems.push('price-point: Twenty reserves `currency`, use currencyCode');
  const offeringSrc = read('src/objects/offering.object.ts');
  if (!/uniqueText\(\{\s*universalIdentifier: F\.offeringCode/.test(offeringSrc)) problems.push('offering.offeringCode must be uniqueText');
  if (!/uniqueText\(\{\s*universalIdentifier: F\.correlationId/.test(read('src/objects/price-point.object.ts'))) problems.push('price-point.correlationId must be uniqueText');
  for (const file of ['offerings-table', 'price-points-table', 'bundle-items-table', 'pricing-publications-table']) {
    if (!existsSync(join(ROOT, `src/views/${file}.view.ts`))) problems.push(`src/views/${file}.view.ts missing`);
  }
  const layoutSrc = read('src/page-layouts/offering-record.page-layout.ts');
  for (const tab of ["'Overview'", "'Price Points'", "'Bundle Items'"]) if (!layoutSrc.includes(`title: ${tab}`)) problems.push(`offering-record page layout lacks the ${tab} tab`);
  for (const view of ['offering-price-points', 'offering-bundle-items']) {
    if (!/type: ViewType\.TABLE_WIDGET/.test(read(`src/views/${view}.view.ts`))) problems.push(`${view} must be a TABLE_WIDGET view`);
  }
  if (!read('src/navigation/pricing.nav.ts').includes('IDS.views.offeringsTable.view')) problems.push('Pricing nav must open the Offerings table');

  // Select options: the object sources and shared agree.
  const types = values(p.STRATEGY_TYPES);
  const formats = values(p.DISPLAY_FORMATS);
  if (JSON.stringify(types.slice().sort()) !== JSON.stringify(['ADD_ON', 'BUNDLE', 'CUSTOM', 'FLAT', 'PER_SEAT', 'QUOTE_ONLY', 'TIERED'])) problems.push(`strategy types [${types}]`);
  if (JSON.stringify(formats.slice().sort()) !== JSON.stringify(['ADD_ON_LIST', 'BUNDLE_COMPARISON', 'CONTACT_CTA', 'HIDDEN', 'PRICE_CARD', 'SEAT_PRICING', 'TIER_TABLE'])) problems.push(`display formats [${formats}]`);
  if (JSON.stringify(values(p.CURRENCIES)) !== JSON.stringify(['EUR', 'CNY', 'USD', 'GBP'])) problems.push('currencies must be EUR/CNY/USD/GBP');

  // D3 display rules: format per type, "from" prefix, amounts hidden.
  const D3 = {
    FLAT: 'PRICE_CARD',
    TIERED: 'TIER_TABLE',
    BUNDLE: 'BUNDLE_COMPARISON',
    PER_SEAT: 'SEAT_PRICING',
    ADD_ON: 'ADD_ON_LIST',
    QUOTE_ONLY: 'CONTACT_CTA',
    CUSTOM: 'HIDDEN',
  };
  for (const [type, format] of Object.entries(D3)) {
    if (p.DISPLAY_FORMAT_FOR_TYPE[type] !== format) problems.push(`D3: ${type} → ${p.DISPLAY_FORMAT_FOR_TYPE[type]}, want ${format}`);
  }
  const uncovered = types.filter((t) => !formats.includes(p.DISPLAY_FORMAT_FOR_TYPE[t]));
  if (uncovered.length) problems.push(`DISPLAY_FORMAT_FOR_TYPE lacks a valid format for ${uncovered.join(', ')}`);
  const fromCases = [
    [{ strategyType: 'ADD_ON' }, true],
    [{ strategyType: 'FLAT', hasOptionalExtras: true }, true],
    [{ strategyType: 'FLAT' }, false],
    [{ strategyType: 'TIERED', fromPrefix: true }, true],
    [{ strategyType: 'TIERED', hasOptionalExtras: false, fromPrefix: false }, false],
  ];
  for (const [o, want] of fromCases) if (p.fromPrefixFor(o) !== want) problems.push(`D3: fromPrefixFor(${JSON.stringify(o)}) !== ${want}`);
  if (!p.hidesAmounts({ strategyType: 'FLAT', displayFormat: 'CONTACT_CTA' }) || !p.hidesAmounts({ strategyType: 'FLAT', displayFormat: 'HIDDEN' }) || !p.hidesAmounts({ strategyType: 'QUOTE_ONLY', displayFormat: 'PRICE_CARD' }) || p.hidesAmounts({ strategyType: 'TIERED' })) {
    problems.push('D3: CONTACT_CTA / HIDDEN / QUOTE_ONLY hide amounts, nothing else does');
  }

  const optionsSource = read('src/options.ts');
  const tierBlock = /export const TIER = options\(\[([\s\S]*?)\]\);/.exec(optionsSource)?.[1] ?? '';
  const tiers = [...tierBlock.matchAll(/\['([A-Z_]+)',/g)].map((m) => m[1]);
  if (JSON.stringify(values(p.PRICE_TIERS)) !== JSON.stringify(tiers)) {
    problems.push(`shared/public-pricing.mjs PRICE_TIERS [${values(p.PRICE_TIERS).join(', ')}] ≠ TIER [${tiers.join(', ')}]`);
  }

  // Seed: the canonical offerings from the plan.
  const seed = p.OFFERINGS;
  const byCode = Object.fromEntries(seed.map((o) => [o.offeringCode, o]));
  const allPoints = seed.flatMap((o) => o.pricePoints);
  const codes = seed.map((o) => o.offeringCode);
  const keys = allPoints.map((x) => x.correlationId);
  if (new Set([...codes, ...keys]).size !== codes.length + keys.length) problems.push('shared/public-pricing.mjs: duplicate offeringCodes / correlationIds');
  if (codes.some((c) => !/^[A-Z][A-Z0-9_]*$/.test(c))) problems.push('offeringCodes must be UPPER_SNAKE');
  if (keys.some((k) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(k))) problems.push('correlationIds must be kebab-case');
  const PLAN = {
    DPP_SUBSCRIPTION: ['TIERED', 'TIER_TABLE', [950, 2500, 6000, null]],
    AR: ['TIERED', 'TIER_TABLE', [250, 1200, 3000, null]],
    AR_DPP_BUNDLE: ['BUNDLE', 'BUNDLE_COMPARISON', [1020, 3145, 7650, null]],
    EPREL_REGISTRATION: ['FLAT', 'PRICE_CARD', [500]],
    BATTERY_PASSPORT: ['ADD_ON', 'ADD_ON_LIST', [1500]],
    TRAINING_LIVE: ['PER_SEAT', 'SEAT_PRICING', [150]],
    TRAINING_RECORDED: ['PER_SEAT', 'SEAT_PRICING', [89]],
    BOSS: ['QUOTE_ONLY', 'CONTACT_CTA', [null]],
  };
  if (JSON.stringify(codes) !== JSON.stringify(Object.keys(PLAN))) problems.push(`seed offerings [${codes}] ≠ plan [${Object.keys(PLAN)}]`);
  for (const [code, [type, format, fees]] of Object.entries(PLAN)) {
    const o = byCode[code];
    if (!o) continue;
    if (o.strategyType !== type || o.displayFormat !== format) problems.push(`${code}: ${o.strategyType}/${o.displayFormat}, want ${type}/${format}`);
    if (o.displayFormat !== p.DISPLAY_FORMAT_FOR_TYPE[o.strategyType]) problems.push(`${code}: displayFormat ${o.displayFormat} breaks D3`);
    if (o.fromPrefix !== p.fromPrefixFor(o)) problems.push(`${code}: fromPrefix ${o.fromPrefix} breaks D3 (ADD_ON / hasOptionalExtras)`);
    if (JSON.stringify(o.pricePoints.map((x) => x.annualFeeEur)) !== JSON.stringify(fees)) problems.push(`${code}: fees [${o.pricePoints.map((x) => x.annualFeeEur)}], want [${fees}]`);
    for (const x of o.pricePoints) {
      if ((x.annualFeeEur === null) !== x.isOnRequest) problems.push(`${x.correlationId}: on request iff no fee`);
      if (x.currencyCode !== 'EUR' || x.isLegacy) problems.push(`${x.correlationId}: seed prices are EUR and not legacy`);
    }
    if (type === 'TIERED' || type === 'BUNDLE') {
      if (JSON.stringify(o.pricePoints.map((x) => x.tier)) !== JSON.stringify(tiers)) problems.push(`${code}: price points are not one per tier in order`);
      if (o.pricePoints.some((x) => (x.tier === 'BOSS') !== x.isOnRequest)) problems.push(`${code}: Boss (and only Boss) must be on request`);
    }
  }
  const fee = (code, tier) => byCode[code]?.pricePoints.find((x) => x.tier === tier)?.annualFeeEur;
  for (const tier of tiers.filter((t) => t !== 'BOSS')) {
    const want = Math.round((fee('DPP_SUBSCRIPTION', tier) + fee('AR', tier)) * (1 - p.BUNDLE_DISCOUNT) * 100) / 100;
    if (fee('AR_DPP_BUNDLE', tier) !== want) problems.push(`Bundle ${tier} = ${fee('AR_DPP_BUNDLE', tier)}, want DPP + AR less ${p.BUNDLE_DISCOUNT * 100}% = ${want}`);
  }

  // Bundle items: the seed obeys the rules, and the rules reject what they should.
  for (const b of p.BUNDLE_ITEMS) {
    const problem = p.bundleItemProblem(byCode[b.bundle], byCode[b.component]);
    if (problem) problems.push(`seed bundle item ${b.bundle} → ${b.component}: ${problem}`);
  }
  if (JSON.stringify(p.BUNDLE_ITEMS.map((b) => b.component)) !== JSON.stringify(['DPP_SUBSCRIPTION', 'AR'])) problems.push('the AR + DPP bundle is DPP + AR');
  if (!p.bundleItemProblem(byCode.AR, byCode.DPP_SUBSCRIPTION)) problems.push('a bundle item whose bundle is not BUNDLE must be rejected');
  if (!p.bundleItemProblem(byCode.AR_DPP_BUNDLE, byCode.AR_DPP_BUNDLE)) problems.push('a bundle item whose component is a BUNDLE must be rejected');

  // Transform: seed as REST records, plus an inactive, an expired, a quote-only and a no-CTA-leak offering.
  let n = 0;
  const offerings = [];
  const pricePoints = [];
  const add = (o, extra = {}) => {
    const id = `o${(n += 1)}`;
    offerings.push({ ...o, ...extra, id, description: { markdown: o.description, blocknote: null }, features: { markdown: (o.features ?? []).map((f) => `- ${f}`).join('\n'), blocknote: null } });
    pricePoints.push(...o.pricePoints.map((x) => ({ ...x, id: `${id}-${x.correlationId}`, offeringId: id, description: x.description })));
    return id;
  };
  seed.forEach((o) => add(o));
  const idOf = (code) => offerings.find((o) => o.offeringCode === code).id;
  const bundleItems = [
    { id: 'b1', bundleId: idOf('AR_DPP_BUNDLE'), componentId: idOf('AR'), included: true, sortOrder: 1 },
    { id: 'b2', bundleId: idOf('AR_DPP_BUNDLE'), componentId: idOf('DPP_SUBSCRIPTION'), included: true, sortOrder: 0 },
    { id: 'b3', bundleId: idOf('AR_DPP_BUNDLE'), componentId: idOf('EPREL_REGISTRATION'), included: false, sortOrder: 2 },
    { id: 'b4', bundleId: idOf('AR'), componentId: idOf('DPP_SUBSCRIPTION'), included: true, sortOrder: 0 },
  ];
  add({ ...seed[0], offeringCode: 'INACTIVE' }, { isActive: false });
  add({ ...seed[0], offeringCode: 'EXPIRED' }, { validUntil: '2026-06-30' });
  add({ ...seed[0], offeringCode: 'FUTURE' }, { validFrom: '2027-01-01' });
  add({ ...seed[0], offeringCode: 'LASTDAY' }, { validUntil: '2026-10-04', sortOrder: 100 });
  add({ ...seed[3], offeringCode: 'LEAKY' }, { strategyType: 'QUOTE_ONLY', displayFormat: 'PRICE_CARD', sortOrder: 101 });
  add({ ...seed[3], offeringCode: 'EXTRAS' }, { hasOptionalExtras: true, fromPrefix: false, sortOrder: 102 });
  const legacyPoint = { ...pricePoints.find((x) => x.correlationId === 'ar-boost-2026'), id: 'legacy', correlationId: 'ar-boost-2025', isLegacy: true };
  pricePoints.push(legacyPoint);
  const now = new Date('2026-10-04T12:00:00Z');
  const pub = p.buildPublicPricing({ offerings: offerings.slice().reverse(), pricePoints, bundleItems }, { now, version: '2026-10-04.1' });
  const pubCodes = pub.offerings.map((o) => o.offeringCode);
  if (JSON.stringify(pubCodes) !== JSON.stringify([...codes, 'LASTDAY', 'LEAKY', 'EXTRAS'])) {
    problems.push(`published offerings [${pubCodes.join(', ')}]: want active + inside validFrom..validUntil (inclusive), in sortOrder`);
  }
  if (pub.publishedAt !== now.toISOString() || pub.version !== '2026-10-04.1') problems.push('publishedAt / version');
  if (JSON.stringify(Object.keys(pub)) !== JSON.stringify(['publishedAt', 'version', 'offerings'])) problems.push(`document keys [${Object.keys(pub)}]`);
  const OFFERING_KEYS = ['offeringCode', 'name', 'strategyType', 'displayFormat', 'fromPrefix', 'description', 'features', 'pricePoints', 'bundleOf'];
  const POINT_KEYS = ['correlationId', 'tier', 'annualFeeEur', 'currency', 'isOnRequest', 'isHighlighted', 'description'];
  for (const o of pub.offerings) {
    if (JSON.stringify(Object.keys(o)) !== JSON.stringify(OFFERING_KEYS)) problems.push(`offering keys [${Object.keys(o)}]`);
    for (const x of o.pricePoints) {
      if (JSON.stringify(Object.keys(x)) !== JSON.stringify(POINT_KEYS)) problems.push(`price point keys [${Object.keys(x)}]`);
      if (x.isOnRequest && x.annualFeeEur !== null) problems.push(`${x.correlationId}: on request but carries an amount`);
    }
  }
  const pubBy = (code) => pub.offerings.find((o) => o.offeringCode === code);
  if (pubBy('AR').pricePoints.some((x) => x.correlationId === 'ar-boost-2025')) problems.push('isLegacy price points must be skipped entirely');
  if (pubBy('AR').pricePoints.length !== 4) problems.push('AR publishes its four tiers');
  const boss = pubBy('BOSS');
  if (boss?.displayFormat !== 'CONTACT_CTA' || boss.pricePoints.some((x) => !x.isOnRequest || x.annualFeeEur !== null)) problems.push('Boss not published as CONTACT_CTA with every price on request');
  const leaky = pubBy('LEAKY');
  if (leaky?.pricePoints.some((x) => x.annualFeeEur !== null || !x.isOnRequest)) problems.push('a QUOTE_ONLY offering must never publish an amount, whatever its displayFormat');
  const dpp = pubBy('DPP_SUBSCRIPTION');
  if (dpp?.description !== seed[0].description) problems.push('description not published as markdown');
  if (JSON.stringify(dpp?.pricePoints[0]) !== JSON.stringify({
    correlationId: 'dpp-beginner-2026', tier: 'BEGINNER', annualFeeEur: 950, currency: 'EUR', isOnRequest: false, isHighlighted: false, description: '',
  })) problems.push(`dpp-beginner-2026 published as ${JSON.stringify(dpp?.pricePoints[0])}`);
  if (dpp.pricePoints[3].annualFeeEur !== null || !dpp.pricePoints[3].isOnRequest) problems.push('an on-request price point publishes annualFeeEur null');
  if (pubBy('BATTERY_PASSPORT').fromPrefix !== true || pubBy('EXTRAS').fromPrefix !== true || pubBy('EPREL_REGISTRATION').fromPrefix !== false) problems.push('fromPrefix: ADD_ON and hasOptionalExtras publish true (D3), a plain FLAT false');
  if (JSON.stringify(pubBy('AR_DPP_BUNDLE').bundleOf) !== JSON.stringify(['DPP_SUBSCRIPTION', 'AR'])) problems.push(`bundleOf ${JSON.stringify(pubBy('AR_DPP_BUNDLE').bundleOf)}: want the included components in sortOrder`);
  if (pubBy('AR').bundleOf.length || pubBy('DPP_SUBSCRIPTION').bundleOf.length) problems.push('only a BUNDLE offering has bundleOf');
  if (JSON.stringify(p.featuresOf('- One\n* Two\n\n3. Three\n  Four')) !== '["One","Two","Three","Four"]') problems.push('featuresOf strips list markers and blank lines');
  if (p.nextVersion([{ version: '2026-10-04.1' }, { version: '2026-10-03.7' }, { version: '2026-10-04.2' }], now) !== '2026-10-04.3') problems.push('nextVersion counts the day\'s publications');
  if (p.invalidBundleItems(offerings, bundleItems).map((x) => x.item.id).join() !== 'b4') problems.push('invalidBundleItems should flag exactly the AR-as-bundle item');

  // The PublicPricingV1 schema accepts the document and rejects leaks / malformed data.
  const bad = (mutate) => {
    const copy = structuredClone(pub);
    mutate(copy);
    return p.PublicPricingV1.safeParse(copy).success;
  };
  if (!p.PublicPricingV1.safeParse(pub).success) problems.push(`PublicPricingV1 rejects the published document: ${p.PublicPricingV1.safeParse(pub).issues?.join('; ')}`);
  const REJECTED = {
    'an unexpected key (a leak)': (d) => { d.offerings[0].pricePoints[0].setupFeeEur = 1; },
    'a bad publishedAt': (d) => { d.publishedAt = '2026-10-04'; },
    'a non-string version': (d) => { d.version = 1; },
    'an unknown strategyType': (d) => { d.offerings[0].strategyType = 'FREE'; },
    'an unknown displayFormat': (d) => { d.offerings[0].displayFormat = 'SHOW_FROM_PRICE'; },
    'an unknown tier': (d) => { d.offerings[0].pricePoints[0].tier = 'GOLD'; },
    'a string fee': (d) => { d.offerings[0].pricePoints[0].annualFeeEur = '950'; },
    'an on-request price point with an amount': (d) => { d.offerings[0].pricePoints[3].annualFeeEur = 1; },
    'a priced point flagged on request': (d) => { d.offerings[0].pricePoints[0].isOnRequest = true; },
    'a non-boolean fromPrefix': (d) => { d.offerings[0].fromPrefix = 'true'; },
    'features that are not strings': (d) => { d.offerings[0].features = [1]; },
    'a bundleOf that names an unpublished offering': (d) => { d.offerings.find((o) => o.offeringCode === 'AR_DPP_BUNDLE').bundleOf.push('NOPE'); },
    'bundleOf on a non-bundle': (d) => { d.offerings[0].bundleOf = ['AR']; },
    'a duplicate offeringCode': (d) => { d.offerings[1].offeringCode = d.offerings[0].offeringCode; },
    'a missing offerings array': (d) => { delete d.offerings; },
  };
  for (const [what, mutate] of Object.entries(REJECTED)) if (bad(mutate)) problems.push(`PublicPricingV1 accepted ${what}`);
  if (p.PublicPricingV1.safeParse(null).success || p.PublicPricingV1.safeParse([]).success) problems.push('PublicPricingV1 accepted a non-object');

  // Display copy.
  const priced = (displayFormat, fromPrefix = false) => ({ displayFormat, fromPrefix, pricePoints: [{ annualFeeEur: 2500, isOnRequest: false }, { annualFeeEur: 950, isOnRequest: false }, { annualFeeEur: null, isOnRequest: true }] });
  const copy = [
    [p.offeringHeadline(priced('ADD_ON_LIST', true)), 'from €950/yr'],
    [p.offeringHeadline(priced('PRICE_CARD')), '€3,450/yr'],
    [p.offeringHeadline(priced('PRICE_CARD', true)), 'from €950/yr'],
    [p.offeringHeadline(priced('TIER_TABLE')), null],
    [p.offeringHeadline(priced('BUNDLE_COMPARISON')), null],
    [p.offeringHeadline(priced('SEAT_PRICING')), null],
    [p.offeringHeadline(priced('CONTACT_CTA')), 'On request'],
    [p.offeringHeadline(priced('HIDDEN')), 'On request'],
    [p.offeringHeadline({ displayFormat: 'ADD_ON_LIST', fromPrefix: true, pricePoints: [] }), 'On request'],
    [p.pricePointLabel({ annualFeeEur: 1020, isOnRequest: false }, 'BUNDLE'), '€1,020/yr'],
    [p.pricePointLabel({ annualFeeEur: 99.5, isOnRequest: false }, 'TIERED'), '€99.50/yr'],
    [p.pricePointLabel({ annualFeeEur: 150, isOnRequest: false }, 'PER_SEAT'), '€150/seat'],
    [p.pricePointLabel({ annualFeeEur: null, isOnRequest: true }, 'TIERED'), 'On request'],
  ];
  for (const [got, want] of copy) if (got !== want) problems.push(`display copy "${got}", want "${want}"`);

  if (problems.length) fail(`C1 pricing: ${problems.join('; ')}`);
  else ok(`C1 pricing: ${Object.keys(PLAN_FIELDS).length} objects + views/layout/nav match the plan; D3 format/from-prefix/hidden rules for ${types.length} strategy types; ${seed.length} seed offerings, ${allPoints.length} price points (Bundle −${p.BUNDLE_DISCOUNT * 100}%), ${p.BUNDLE_ITEMS.length} bundle items; pricing.json filters live/legacy/on-request, schema rejects ${Object.keys(REJECTED).length} malformed cases; ${copy.length} display-copy cases`);
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
  const p = await import(pathToFileURL(join(ROOT, 'shared/public-pricing.mjs')).href);
  const today = '2026-06-01';

  // The seed as the CRM would return it: offerings with ids, price points pointing at them.
  const offerings = p.OFFERINGS.map(({ pricePoints, ...o }, i) => ({ ...o, id: `offering-${i}` }));
  const points = p.OFFERINGS.flatMap((o, i) => o.pricePoints.map((x) => ({ ...x, offeringId: `offering-${i}` })));
  const idx = (code) => p.OFFERINGS.findIndex((o) => o.offeringCode === code);
  const plan = s.planSync(offerings, points, {}, today);
  if (plan.products.length !== 8 || plan.products.filter((x) => !x.active).map((x) => x.id).join() !== 'BOSS') problems.push('want eight products from the seed, only BOSS (quote-only) inactive');
  if (plan.prices.length !== 11) problems.push(`seed → ${plan.prices.length} prices; want 11 (DPP 3, AR 3, bundle 3, EPREL, Battery Passport)`);
  const reasons = Object.fromEntries(['on_request', 'offering_hidden', 'per_seat_not_synced'].map((r) => [r, plan.skipped.filter((x) => x.reason === r).length]));
  if (plan.skipped.length !== 6 || reasons.on_request !== 3 || reasons.offering_hidden !== 1 || reasons.per_seat_not_synced !== 2) problems.push(`seed skipped ${JSON.stringify(plan.skipped)}; want 3 Boss rows on_request, the Boss offering hidden, 2 per-seat`);
  const beginner = plan.prices.find((x) => x.lookupKey === 'dpp-beginner-2026');
  if (!beginner || beginner.unitAmount !== 95000 || beginner.currency !== 'eur' || beginner.interval !== 'year' || beginner.productId !== 'DPP_SUBSCRIPTION') {
    problems.push(`dpp-beginner-2026 → ${JSON.stringify(beginner)}; want 95000 eur/year on product DPP_SUBSCRIPTION`);
  }
  if (beginner?.metadata.tier !== 'BEGINNER' || beginner?.metadata.displayFormat !== 'TIER_TABLE' || beginner?.metadata.offeringCode !== 'DPP_SUBSCRIPTION' || 'highlighted' in (beginner?.metadata ?? {})) {
    problems.push('price metadata: tier, offeringCode and D3 displayFormat set, highlighted only when highlighted');
  }
  if (plan.prices.find((x) => x.lookupKey === 'eprel-registration-2026')?.unitAmount !== 50000) problems.push('EPREL registration → 50000 cents');
  if (s.toCents(19.99) !== 1999 || s.toCents(1020) !== 102000) problems.push('toCents rounds to whole cents');

  // Highlighted, on-request, legacy, hidden and inactive.
  const highlighted = points.map((it) => (it.correlationId === 'ar-boost-2026' ? { ...it, isHighlighted: true } : it));
  if (s.planSync(offerings, highlighted, {}, today).prices.find((x) => x.lookupKey === 'ar-boost-2026')?.metadata.highlighted !== 'true') problems.push('isHighlighted → metadata.highlighted "true"');
  const legacy = points.map((it) => (it.correlationId === 'ar-boost-2026' ? { ...it, isLegacy: true } : it));
  const legacyPlan = s.planSync(offerings, legacy, {}, today);
  if (legacyPlan.prices.some((x) => x.lookupKey === 'ar-boost-2026') || !legacyPlan.skipped.some((x) => x.correlationId === 'ar-boost-2026' && x.reason === 'legacy')) problems.push('an isLegacy price point gets no price');
  const hidden = offerings.map((o) => (o.offeringCode === 'AR' ? { ...o, displayFormat: 'CONTACT_CTA' } : o));
  const hiddenPlan = s.planSync(hidden, points, {}, today);
  if (hiddenPlan.products.find((x) => x.id === 'AR')?.active !== false) problems.push('CONTACT_CTA offering → product active false');
  if (hiddenPlan.prices.some((x) => x.productId === 'AR') || hiddenPlan.skipped.filter((x) => x.reason === 'offering_hidden').length !== 5) problems.push('CONTACT_CTA offering → none of its price points gets a price');
  const bundleIdx = idx('AR_DPP_BUNDLE');
  const expired = offerings.map((o) => (o.id === `offering-${bundleIdx}` ? { ...o, isActive: false } : o));
  if (s.planSync(expired, points, {}, today).products.length !== 7) problems.push('no filter syncs live offerings only');
  if (s.planSync(expired, points, { offeringId: `offering-${bundleIdx}` }, today).products[0]?.active !== false) problems.push('an inactive offering asked for by id → inactive product');

  // Filters.
  const one = s.planSync(offerings, points, { correlationIds: ['ar-builder-2026'] }, today);
  if (one.products.length !== 1 || one.prices.length !== 1 || one.prices[0].lookupKey !== 'ar-builder-2026') problems.push('a price point correlationId syncs that point only');
  const whole = s.planSync(offerings, points, { correlationIds: ['AR'] }, today);
  if (whole.products.length !== 1 || whole.prices.length !== 3) problems.push('an offeringCode syncs the offering and its priced points');
  if (s.planSync(offerings, points, { offeringId: `offering-${idx('DPP_SUBSCRIPTION')}` }, today).products[0].id !== 'DPP_SUBSCRIPTION') problems.push('offeringId filter');

  // Idempotency: the same input plans the same state, and a matching Stripe needs no write.
  if (JSON.stringify(s.planSync(offerings, points, {}, today)) !== JSON.stringify(plan)) problems.push('planSync is not deterministic');
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
  else ok(`C2 Stripe sync: seed → ${plan.products.length} products, ${plan.prices.length} prices (EUR cents, yearly), ${plan.skipped.length} skipped (on request, legacy, per-seat, hidden); hidden/inactive/legacy/highlight/filter cases; idempotent plan + metadata patch; webhook signature accepts only a valid, fresh one`);
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

  // Plan fields and objects (Managed Agents rewrite).
  const objectFields = (file) => [...read(file).matchAll(/^\s+name: '([A-Za-z]+)',/gm)].map((m) => m[1]);
  const needFields = (file, names) => {
    const have = objectFields(file);
    const missing = names.filter((n) => !have.includes(n));
    if (missing.length) problems.push(`${file} lacks fields: ${missing.join(', ')}`);
  };
  needFields('src/objects/research-brief.object.ts', ['focusAreas', 'competitorWatchlist', 'regulatoryWatchlist', 'cadenceDays', 'subscribers', 'lastRunAt', 'nextRunAt', 'agentId', 'systemPromptVersion']);
  needFields('src/objects/research-report.object.ts', ['brief', 'status', 'sessionId', 'startedAt', 'completedAt', 'costUsd', 'findingsCount', 'reportUrl', 'errorMessage']);
  needFields('src/objects/research-finding.object.ts', ['report', 'brief', 'title', 'body', 'category', 'importance', 'sourceUrls', 'publicationDate', 'isCited', 'isTaskCreated', 'taskId', 'suggestedOwner']);
  needFields('src/objects/competitor.object.ts', ['name', 'website', 'competitorOf', 'description', 'lastObservationAt']);
  needFields('src/objects/competitor-price-observation.object.ts', ['competitor', 'offering', 'competitorPriceEur', 'currencyCode', 'observedAt', 'sourceUrl', 'notes']);

  const reportStatuses = r.REPORT_STATUSES.map((d) => d.value).join();
  const categoriesWant = 'REGULATORY,COMPETITOR,PRICING,DEMAND,TECHNOLOGY,OTHER';
  if (reportStatuses !== 'RUNNING,INGESTING,READY,FAILED') problems.push(`report statuses are [${reportStatuses}]`);
  if (r.FINDING_CATEGORIES.map((d) => d.value).join() !== categoriesWant) problems.push('finding categories');
  if (r.FINDING_IMPORTANCES.map((d) => d.value).join() !== 'HIGH,MEDIUM,LOW') problems.push('finding importances');

  // The agent prompt: no CRM credentials, linkedin blocked, the findings.json contract.
  if (!existsSync(join(ROOT, 'research/agent.md'))) problems.push('research/agent.md is missing');
  else {
    const agent = read('research/agent.md');
    if (!/^---\s*\nversion: \d+\s*\n---/.test(agent)) problems.push('research/agent.md has no version front matter');
    if (!/linkedin\.com/.test(agent)) problems.push('agent.md must block linkedin.com');
    if (!/no CRM credentials/i.test(agent)) problems.push('agent.md must say the agent has no CRM credentials');
    for (const key of ['findings.json', 'report.md', 'sourceUrls', 'priceObservations', 'competitors']) {
      if (!agent.includes(key)) problems.push(`agent.md output contract lacks ${key}`);
    }
  }

  // Session request policy: pinned beta, $10 cap, outcome built from the brief.
  const a = await import(pathToFileURL(join(ROOT, 'shared/research-agent.mjs')).href);
  if (!/^managed-agents-\d{4}-\d{2}-\d{2}$/.test(a.MANAGED_AGENTS_BETA)) problems.push('Managed Agents beta header is not pinned');
  if (JSON.stringify(a.RUN_BUDGET) !== '{"type":"limit","max_list_cost":{"amount":"1000","currency":"USD"}}') problems.push('run budget is not $10 (1000 cents)');
  const desc = a.buildOutcomeDescription(
    { title: 'T', focusAreas: { markdown: 'FOCUS' }, competitorWatchlist: 'COMP', regulatoryWatchlist: { markdown: 'REG' } },
    [{ title: 'OLD', category: 'PRICING' }],
  );
  for (const bit of ['FOCUS', 'COMP', 'REG', 'OLD']) if (!desc.includes(bit)) problems.push(`outcome description lacks ${bit}`);
  if (!a.RESEARCH_RUBRIC.includes('findings.json')) problems.push('rubric must check findings.json');

  const scheduler = read('src/functions/research-scheduler.ts');
  const managed = read('src/functions/lib/managed-agents.ts');
  if (!/nextRunAt/.test(scheduler) || !/RUN_BUDGET/.test(scheduler) || !/status: 'RUNNING'/.test(scheduler)) problems.push('research-scheduler must use nextRunAt, the run budget and create RUNNING reports');
  if (!managed.includes('/v1/sessions') || !managed.includes('user.define_outcome') || !managed.includes('MANAGED_AGENTS_BETA')) problems.push('managed-agents client must POST /v1/sessions with user.define_outcome and the pinned beta header');
  if (/CRM|TWENTY_API/.test(managed.replace(/\/\*[\s\S]*?\*\//, ''))) problems.push('the Managed Agents client must never touch CRM credentials');
  if (!/scope_id/.test(managed)) problems.push('ingest must list session files by scope_id');
  const ingest = read('src/functions/research-ingest.ts');
  if (!/FindingsFile\.safeParse/.test(read('src/functions/lib/research-contract.ts') + ingest)) problems.push('research-ingest must validate findings.json with zod');
  if (existsSync(join(ROOT, 'src/functions/run-research.ts'))) problems.push('run-research.ts should be deleted (replaced by research-scheduler.ts)');

  if (problems.length) fail(`D1-D2 research: ${problems.join('; ')}`);
  else ok(`D1-D2 research: ${r.RESEARCH_TOPICS.length} prompts on PRODUCT_CATEGORY topics (OTHER has none); ${depths.length} depths, ${statuses.length} statuses; prompt builder; plan fields + 4 research objects, agent.md, Managed Agents session (pinned beta, $10 cap, define_outcome), zod-validated ingest`);
}

// --------------------------------------------------------- 20. F0.5 leadSource
{
  const problems = [];
  const objectsToCheck = ['person', 'company', 'opportunity'];
  for (const obj of objectsToCheck) {
    const objFiles = Object.entries(sources).filter(
      ([f]) => f.startsWith(join(SRC, 'objects', obj) + '/') && f.endsWith('.field.ts')
    );
    const hasLeadSource = objFiles.some(([, text]) => /name:\s*['"]leadSource['"]/.test(text));
    if (!hasLeadSource) problems.push(`${obj} missing leadSource field`);
  }
  if (problems.length) fail(`F0.5 leadSource: ${problems.join('; ')}`);
  else ok(`F0.5 leadSource: Person, Company, and Opportunity all have leadSource field`);
}

// ------------------------------------------- 21. A2 lead import + enrichment
{
  const problems = [];
  const li = await import(pathToFileURL(join(ROOT, 'shared/lead-import.mjs')).href);
  const fieldNames = (file) => [...(sources[join(SRC, file)] ?? '').matchAll(/\bname:\s*'(\w+)'/g)].map((m) => m[1]);

  const A2_FIELDS = [
    'contactName', 'contactTitle', 'contactEmail', 'province', 'employeeBand', 'exportRevenueBand', 'euExportEvidence',
    'hasEuAr', 'recommendedStream', 'icpScore', 'icpTier', 'scoreRationale', 'scoreCitations', 'scoreModel',
    'scoreRubricVersion', 'scoredAt', 'dedupeKey', 'reviewStatus', 'rejectReason', 'reviewedBy', 'importId',
    'isGdprArt14Sent', 'gdprArt14SentAt', 'isPotentialCompetitor',
  ];
  const KEPT_FIELDS = [
    'companyName', 'companyNameZh', 'website', 'linkedinUrl', 'industry', 'companySize', 'headquarters', 'productCategories',
    'description', 'emailDomains', 'isExportedToCRM', 'exportedCompanyId', 'isDuplicate', 'score', 'scoreBreakdown',
  ];
  const dc = fieldNames('objects/discovered-company.object.ts');
  const missingDc = [...A2_FIELDS, ...KEPT_FIELDS].filter((f) => !dc.includes(f));
  if (missingDc.length) problems.push(`DiscoveredCompany lacks ${missingDc.join(', ')}`);
  const dcSource = sources[join(SRC, 'objects/discovered-company.object.ts')] ?? '';
  if (!/uniqueText\(\{[^}]*name:\s*'dedupeKey'/.test(dcSource)) problems.push('DiscoveredCompany.dedupeKey must be unique');
  if (!/name:\s*'reviewStatus'[^\n]*defaultValue:\s*'NEW'/.test(dcSource)) problems.push("DiscoveredCompany.reviewStatus must default to 'NEW'");

  const LEAD_IMPORT_FIELDS = ['name', 'fileName', 'status', 'rowCount', 'importedCount', 'duplicateCount', 'errorCount', 'source', 'uploadedBy', 'startedAt', 'completedAt', 'errorLog'];
  if (!existsSync(join(SRC, 'objects/lead-import.object.ts'))) problems.push('src/objects/lead-import.object.ts is missing');
  const imp = fieldNames('objects/lead-import.object.ts');
  const missingImp = LEAD_IMPORT_FIELDS.filter((f) => !imp.includes(f));
  if (missingImp.length) problems.push(`LeadImport lacks ${missingImp.join(', ')}`);

  const FUNCTIONS = ['import-leads-csv', 'enrich-discovered-company', 'check-safety-gate', 'send-gdpr-art14'];
  for (const f of FUNCTIONS) if (!existsSync(join(SRC, 'functions', `${f}.ts`))) problems.push(`src/functions/${f}.ts is missing`);
  for (const f of ['ops/import-leads.mjs', 'ops/enrich-all-new.mjs', 'src/views/lead-imports-table.view.ts']) if (!existsSync(join(ROOT, f))) problems.push(`${f} is missing`);

  const viewSource = sources[join(SRC, 'views/discovered-companies-table.view.ts')] ?? '';
  for (const f of ['reviewStatus', 'icpTier', 'icpScore', 'isGdprArt14Sent']) if (!viewSource.includes(`D.${f}`)) problems.push(`discovered companies view lacks ${f}`);

  // budgets
  if (li.ENRICHMENT_BUDGET_USD !== 0.5) problems.push('enrichment budget must be $0.50');
  if (li.SAFETY_CHECK_BUDGET_USD !== 0.3) problems.push('Safety Gate budget must be $0.30');
  const maxEnrichPrompt = 40_000;
  if (li.worstCaseUsd(maxEnrichPrompt, li.ENRICHMENT_MAX_OUTPUT_TOKENS) > li.ENRICHMENT_BUDGET_USD) problems.push('a 40k-token enrichment prompt must fit the $0.50 cap');
  if (li.worstCaseUsd(0, li.SAFETY_MAX_OUTPUT_TOKENS, li.SAFETY_MAX_SEARCHES) > li.SAFETY_CHECK_BUDGET_USD) problems.push('Safety Gate max_tokens + searches must fit the $0.30 cap');
  if (!/maxInputTokens|worstCaseUsd\(/.test(sources[join(SRC, 'functions/enrich-discovered-company.ts')] ?? '')) problems.push('enrich-discovered-company must check the worst case against the cap');
  if (!/max_uses:\s*SAFETY_MAX_SEARCHES/.test(sources[join(SRC, 'functions/check-safety-gate.ts')] ?? '')) problems.push('check-safety-gate must cap web searches');

  // dedupe
  const same = (a, b) => li.dedupeKey(a) === li.dedupeKey(b);
  if (!same({ linkedinUrl: 'https://cn.linkedin.com/company/Foo/?x=1' }, { linkedinUrl: 'linkedin.com/company/foo' })) problems.push('the same LinkedIn page must give one dedupeKey');
  if (!same({ companyName: 'Shenzhen ABC Co., Ltd.', headquarters: 'Shenzhen, China' }, { companyName: 'shenzhen abc ltd', headquarters: 'Shenzhen' })) problems.push('name + headquarters dedupeKey must ignore case, punctuation and company suffixes');
  if (same({ companyName: 'ABC', headquarters: 'Shenzhen' }, { companyName: 'ABC', headquarters: 'Ningbo' })) problems.push('different headquarters must give different dedupeKeys');
  if (li.likelySameCompany({ companyName: 'ABC Ltd', headquarters: '' }, { companyName: 'ABC Ltd', headquarters: '' })) problems.push('no headquarters is not a likely duplicate');

  // row mapping
  const row = li.mapImportRow({ 'Company Name': 'ABC', LinkedIn: 'https://www.linkedin.com/company/abc/about', Website: 'www.abc.cn/en?x=1', HQ: 'Shenzhen', Email: 'sales@abc.cn' });
  if (!row.ok || row.record.linkedinUrl !== 'https://www.linkedin.com/company/abc' || row.record.website !== 'https://www.abc.cn' || row.record.contactEmail !== 'sales@abc.cn') problems.push('mapImportRow does not normalise headers, LinkedIn, website');
  for (const bad of [{}, { companyName: 'X', linkedinUrl: 'https://www.linkedin.com/in/someone' }, { companyName: 'X', contactEmail: 'nope' }, { companyName: 'X', website: 'not a url' }]) {
    if (li.mapImportRow(bad).ok) problems.push(`mapImportRow accepts ${JSON.stringify(bad)}`);
  }

  // enrichment helpers: employee band, SSRF guard
  const bands = [[5, 'MICRO_1_10'], [11, 'SMALL_11_50'], [200, 'MEDIUM_51_200'], [201, 'LARGE_201_PLUS']];
  for (const [n, want] of bands) if (li.employeeBand(n) !== want) problems.push(`employeeBand(${n}) ≠ ${want}`);
  for (const host of ['localhost', '127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '169.254.169.254', '::1']) if (!li.isPrivateHost(host)) problems.push(`isPrivateHost(${host}) must be true`);
  if (li.isPrivateHost('www.example.com') || li.isPrivateHost('8.8.8.8')) problems.push('isPrivateHost rejects a public host');

  // Safety Gate
  if (li.riskLevel(0) !== 'LOW' || li.riskLevel(2) !== 'MEDIUM' || li.riskLevel(3) !== 'HIGH') problems.push('riskLevel must be LOW 0 · MEDIUM 1–2 · HIGH 3+');
  if (li.penalisedScore(80, 'HIGH') !== 55 || li.penalisedScore(5, 'HIGH') !== 0 || li.penalisedScore(80, 'LOW') !== 80) problems.push('Safety Gate score penalty is wrong');

  // ICP tier
  if (li.icpTier(80) !== 'TIER_1_HOT' || li.icpTier(50) !== 'TIER_2_WARM' || li.icpTier(10) !== 'TIER_3_COLD') problems.push('icpTier thresholds are wrong');

  // GDPR Art.14
  const notice = li.gdprArt14Notice({ companyName: 'ABC', contactName: '', contact: 'privacy@example.com' });
  for (const [what, re] of [['controller', /Integra Scientific Ltd/], ['data held', /name .*company name.*website.*LinkedIn/s], ['source', /Where it comes from/], ['legitimate interest', /legitimate interest/], ['retention', /How long we keep it/], ['rights', /access.*rectify.*erase.*object/s], ['complaint', /supervisory authority/], ['contact', /privacy@example\.com/]]) {
    if (!re.test(notice)) problems.push(`Art.14 notice lacks ${what}`);
  }
  const gdpr = sources[join(SRC, 'functions/send-gdpr-art14.ts')] ?? '';
  if (!/Send GDPR Art\.14 notice to \$\{companyName\}/.test(gdpr) || !/isGdprArt14Sent: true/.test(gdpr) || !/gdprArt14SentAt/.test(gdpr)) problems.push('send-gdpr-art14 must create the Task and mark the record');

  if (problems.length) fail(`A2 lead import + enrichment: ${problems.join('; ')}`);
  else ok(`A2 lead import + enrichment: LeadImport (${imp.length} fields) + ${A2_FIELDS.length} new DiscoveredCompany fields (${KEPT_FIELDS.length} kept); ${FUNCTIONS.length} functions; budgets $${li.ENRICHMENT_BUDGET_USD}/$${li.SAFETY_CHECK_BUDGET_USD}; dedupe keys, row mapping, SSRF guard, risk levels, ICP tiers, Art.14 notice`);
}

// ----------------------------------------------------------------- report
for (const p of passes) console.log(`✓ ${p}`);
for (const f of failures) console.log(`✗ ${f}`);
console.log(failures.length ? `\n${failures.length} check(s) FAILED` : `\nall ${passes.length} checks passed`);
process.exit(failures.length ? 1 : 0);
