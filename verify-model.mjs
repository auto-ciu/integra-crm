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
 *  22. B2 stream pipeline: StreamStage + OpportunityLine objects, linked to
 *      ProductStream / Opportunity / Offering both ways; the standard five
 *      stages; stream KPI maths; Pipeline tab, views, nav.
 *  23. C2 client price agreements: ClientPriceAgreement / AgreementLine /
 *      DiscountRule declare their fields; AgreementLine links to both Offering
 *      and PricePoint (inverses declared); OpportunityLine links to ArMandate
 *      and TrainingRegistration; discount maths (standard price incl. the
 *      AR + DPP bundle, rule precedence, value thresholds, approvers), quotes
 *      from an agreement and from an opportunity, the preview overlay on
 *      pricing.json, mandate → offerings → opportunity lines (idempotent);
 *      views, record page tabs, Pricing folder nav, functions, ops scripts.
 *  23. E3 ticket management: Enquiry has the assignee / tags / SLA / activity /
 *      resolution / satisfaction / sourceUrl / internalNotes fields, TicketMacro
 *      and SlaPolicy declare the plan's fields, the inbox / my / overdue views
 *      and the page-layout tabs exist, the SLA defaults are 1/4/8/24h, the
 *      macros seed is EN + ZH, and email-to-ticket's helpers (sender parsing,
 *      threading ids, routing, status after a reply) behave as specified.
 *  24. B3 stream content: StreamUpdate has contentCategory (the five values),
 *      isPublished (default false), publishUrl and the engagementCount
 *      placeholder; only https integrascientific.com URLs pass; the publish
 *      script is idempotent and validates before any API call; report view,
 *      widget and nav.
 *  25. D3 competitive intel: Competitor has priceObservationCount + riskLevel;
 *      risk rules, average, CSV export (columns, quoting, formula defusing);
 *      dashboard view sorted by risk, export script, ingest keeps the summary
 *      fields current, Competitive Intel tab on the stream page.
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
  'ReplyTemplate', 'TicketMacro', 'SlaPolicy',
  'LeadDiscoveryRun', 'DiscoveredCompany', 'LeadImport',
  'TrainingRegistration',
  'CustomerEvent', 'ResearchBrief', 'ResearchReport', 'ResearchFinding', 'Competitor', 'CompetitorPriceObservation',
  'StreamStage', 'OpportunityLine',
  'ClientPriceAgreement', 'AgreementLine', 'DiscountRule',
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
    'src/objects/offering.object.ts': ['name', 'offeringCode', 'productCategory', 'strategyType', 'displayFormat', 'fromPrefix', 'hasOptionalExtras', 'isActive', 'description', 'features', 'validFrom', 'validUntil', 'sortOrder', /* relation inverses: */ 'pricePoints', 'bundleItems', 'componentOf', 'competitorObservations', 'opportunityLines', 'agreementLines', 'discountRules'],
    'src/objects/price-point.object.ts': ['name', 'correlationId', 'offering', 'tier', 'annualFeeEur', 'setupFeeEur', 'currencyCode', 'isHighlighted', 'isOnRequest', 'isLegacy', 'sortOrder', 'description', /* relation inverse: */ 'agreementLines'],
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

// ------------------------------------------------- 22. B2 stream pipeline
{
  const problems = [];
  const k = await import(pathToFileURL(join(ROOT, 'shared/stream-kpis.mjs')).href);
  const fieldNames = (file) => [...stripComments(read(file)).matchAll(/\bname: '([A-Za-z]+)',\s*\n\s*label:/g)].map((m) => m[1]);
  const need = (file, names) => {
    const declared = fieldNames(file);
    const missing = names.filter((n) => !declared.includes(n));
    if (missing.length) problems.push(`${file}: fields missing [${missing}]`);
  };

  // Objects and their fields.
  need('src/objects/stream-stage.object.ts', ['name', 'stream', 'stageName', 'order', 'isDefault', 'description', 'opportunityLines']);
  need('src/objects/opportunity-line.object.ts', ['name', 'opportunity', 'stream', 'stage', 'offering', 'estimatedValueEur', 'probability', 'expectedCloseDate', 'notes', 'isActive']);

  // Stages are linked: each relation's inverse is declared on the other side.
  const linked = [
    ['src/objects/stream-stage.object.ts', 'IDS.productStream.fields.stages', 'streamStage.stream → productStream.stages'],
    ['src/objects/product-stream.object.ts', 'IDS.streamStage.fields.stream', 'productStream.stages ← streamStage.stream'],
    ['src/objects/opportunity-line.object.ts', 'IDS.streamStage.fields.opportunityLines', 'opportunityLine.stage → streamStage.opportunityLines'],
    ['src/objects/stream-stage.object.ts', 'IDS.opportunityLine.fields.stage', 'streamStage.opportunityLines ← opportunityLine.stage'],
    ['src/objects/opportunity-line.object.ts', 'IDS.productStream.fields.opportunityLines', 'opportunityLine.stream → productStream.opportunityLines'],
    ['src/objects/product-stream.object.ts', 'IDS.opportunityLine.fields.stream', 'productStream.opportunityLines ← opportunityLine.stream'],
    ['src/objects/opportunity-line.object.ts', 'IDS.opportunity.fields.opportunityLines', 'opportunityLine.opportunity → opportunity.opportunityLines'],
    ['src/objects/opportunity/opportunity-lines.field.ts', 'IDS.opportunityLine.fields.opportunity', 'opportunity.opportunityLines ← opportunityLine.opportunity'],
    ['src/objects/opportunity-line.object.ts', 'IDS.offering.fields.opportunityLines', 'opportunityLine.offering → offering.opportunityLines'],
    ['src/objects/offering.object.ts', 'IDS.opportunityLine.fields.offering', 'offering.opportunityLines ← opportunityLine.offering'],
  ];
  for (const [file, needle, what] of linked) if (!read(file).includes(needle)) problems.push(`relation not linked: ${what}`);

  // Standard stages: five, in order, 1..5.
  const want = ['Awareness', 'Interest', 'Evaluation', 'Negotiation', 'Closed Won'];
  if (JSON.stringify(k.STANDARD_STAGES.map((s) => s.stageName)) !== JSON.stringify(want)) problems.push('STANDARD_STAGES must be Awareness, Interest, Evaluation, Negotiation, Closed Won');
  if (k.STANDARD_STAGES.some((s, i) => s.order !== i + 1)) problems.push('STANDARD_STAGES order must be 1..5');
  const seed = read('ops/seed-stream-stages.mjs');
  if (!seed.includes('STANDARD_STAGES') || !seed.includes('productStreams') || !seed.includes('existing.has')) problems.push('ops/seed-stream-stages.mjs must seed STANDARD_STAGES per productStream, skipping existing');

  // KPI maths (2026-10-04 is in Q4: 2026-10-01 ≤ d < 2027-01-01).
  const today = new Date('2026-10-04T12:00:00Z');
  const line = (o, stage, order, value, prob, close, isActive = true) => ({ opportunityId: o, stageName: stage, stageOrder: order, estimatedValueEur: value, probability: prob, expectedCloseDate: close, isActive });
  const r = k.computeStreamKpis([
    line('o1', 'Interest', 2, 10000, 50, '2026-11-15'),
    line('o1', 'Evaluation', 3, 4000, 25, '2027-01-01'),
    line('o2', 'Interest', 2, 2000, 100, '2026-12-31'),
    line('o3', 'Awareness', 1, 99999, 100, '2026-10-10', false),
    line('o4', 'Negotiation', 4, null, null, null),
  ], today);
  if (r.pipelineValueEur !== 8000) problems.push(`pipelineValueEur ${r.pipelineValueEur} ≠ 8000`);
  if (r.openOpportunities !== 3) problems.push(`openOpportunities ${r.openOpportunities} ≠ 3`);
  if (r.expectedThisQuarterEur !== 7000) problems.push(`expectedThisQuarterEur ${r.expectedThisQuarterEur} ≠ 7000`);
  if (r.dealsByStage.map((s) => `${s.stageName}:${s.count}`).join() !== 'Interest:2,Evaluation:1,Negotiation:1') problems.push(`dealsByStage ${JSON.stringify(r.dealsByStage)}`);
  if (JSON.stringify(k.quarterBounds(new Date('2026-12-31T23:00:00Z'))) !== JSON.stringify({ start: '2026-10-01', end: '2027-01-01' })) problems.push('quarterBounds Q4 wrong');
  if (k.computeStreamKpis([], today).pipelineValueEur !== 0) problems.push('empty stream must be 0');

  // Views, layouts, nav.
  for (const f of ['stream-stages-table', 'opportunity-lines-table']) if (!/type: ViewType\.TABLE,/.test(read(`src/views/${f}.view.ts`))) problems.push(`${f} must be a TABLE view`);
  const stageView = read('src/views/stream-stages-table.view.ts');
  for (const f of ['stageName', 'order', 'isDefault']) if (!stageView.includes(`S.${f}`)) problems.push(`stream-stages-table lacks ${f}`);
  const lineView = read('src/views/opportunity-lines-table.view.ts');
  for (const f of ['opportunity', 'stream', 'stage', 'offering', 'estimatedValueEur', 'probability', 'expectedCloseDate']) if (!lineView.includes(`L.${f},`)) problems.push(`opportunity-lines-table lacks ${f}`);
  for (const f of ['stream-stage-record', 'opportunity-line-record']) if (!read(`src/page-layouts/${f}.page-layout.ts`).includes("title: 'Overview'")) problems.push(`${f} page layout lacks the Overview tab`);
  const streamLayout = read('src/page-layouts/product-stream-record.page-layout.ts');
  if (!streamLayout.includes("title: 'Pipeline'") || !streamLayout.includes('IDS.frontComponents.streamKpiWidget') || !streamLayout.includes('IDS.views.streamOpportunityLinesWidget')) problems.push("product-stream page layout needs a 'Pipeline' tab with StreamKpiWidget + opportunity lines table");
  if (!/type: ViewType\.TABLE_WIDGET/.test(read('src/views/stream-opportunity-lines.view.ts'))) problems.push('stream-opportunity-lines must be a TABLE_WIDGET view');
  if (!read('src/navigation/stream-stages.nav.ts').includes('IDS.views.streamStagesTable.view')) problems.push('Stream Stages nav must open the Stream Stages table');
  if (!read('src/front-components/StreamKpiWidget.tsx').includes('fetchStreamLines')) problems.push('StreamKpiWidget must fetch via fetchStreamLines');

  if (problems.length) fail(`B2 stream pipeline: ${problems.join('; ')}`);
  else ok('B2 stream pipeline: StreamStage + OpportunityLine linked both ways to ProductStream / Opportunity / Offering; 5 standard stages seeded per stream; KPI maths (weighted value, open opps, by stage, this quarter); Pipeline tab, 2 tables, 2 layouts, nav');
}

// ------------------------------------------- 23. C2 client price agreements
{
  const problems = [];
  const a = await import(pathToFileURL(join(ROOT, 'shared/agreement-pricing.mjs')).href);
  const p = await import(pathToFileURL(join(ROOT, 'shared/public-pricing.mjs')).href);
  const fieldNames = (file) => [...stripComments(read(file)).matchAll(/\bname: '([A-Za-z]+)',\s*\n\s*label:/g)].map((m) => m[1]);
  const exact = (file, names) => {
    const declared = fieldNames(file);
    const missing = names.filter((n) => !declared.includes(n));
    const extra = declared.filter((n) => !names.includes(n));
    if (missing.length || extra.length) problems.push(`${file}: fields missing [${missing}] extra [${extra}]`);
  };
  const same = (got, want, what) => JSON.stringify(got) === JSON.stringify(want) || problems.push(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

  // Objects: the plan's fields (createdBy is Twenty's system field, so the staff member is preparedBy).
  exact('src/objects/client-price-agreement.object.ts', ['name', 'agreementCode', 'client', 'contact', 'opportunity', 'status', 'agreementType', 'startDate', 'endDate', 'signedAt', 'signedBy', 'preparedBy', 'notes', 'lines']);
  exact('src/objects/agreement-line.object.ts', ['name', 'agreement', 'offering', 'pricePoint', 'agreedPriceEur', 'discountPercent', 'discountRationale', 'quantity', 'effectiveFrom', 'effectiveUntil']);
  exact('src/objects/discount-rule.object.ts', ['name', 'offering', 'maxDiscountPercent', 'approver', 'minAgreementValueEur', 'isActive']);
  const opportunityLineFields = fieldNames('src/objects/opportunity-line.object.ts');
  for (const f of ['arMandate', 'trainingRegistration']) if (!opportunityLineFields.includes(f)) problems.push(`OpportunityLine lacks ${f}`);
  const cpa = read('src/objects/client-price-agreement.object.ts');
  if (!/uniqueText\(\{\s*universalIdentifier: F\.agreementCode/.test(cpa)) problems.push('clientPriceAgreement.agreementCode must be uniqueText');
  if (!/options: AGREEMENT_STATUS,\s*\n\s*defaultValue: 'DRAFT'/.test(cpa)) problems.push("clientPriceAgreement.status must use AGREEMENT_STATUS, default 'DRAFT'");
  same(a.AGREEMENT_STATUSES.map((o) => o.value), ['DRAFT', 'PROPOSED', 'ACCEPTED', 'ACTIVE', 'EXPIRED', 'CANCELLED'], 'agreement statuses');
  same(a.AGREEMENT_TYPES.map((o) => o.value), ['STANDARD_PRICING', 'CUSTOM_PRICING', 'VOLUME_DISCOUNT', 'TRAINING_BUNDLE', 'MANDATE'], 'agreement types');
  if (!a.AGREEMENT_CODE_PATTERN.test('CPA-2026-001') || a.AGREEMENT_CODE_PATTERN.test('CPA-26-1')) problems.push('AGREEMENT_CODE_PATTERN must accept CPA-2026-001 only');
  for (const file of ['client-price-agreement', 'agreement-line', 'discount-rule']) {
    if (/\bname: '(currency|type|createdBy)'/.test(read(`src/objects/${file}.object.ts`))) problems.push(`${file}: uses a name Twenty reserves (currency / type / createdBy)`);
  }
  const rule = read('src/objects/discount-rule.object.ts');
  if (!/boolean\(\{\s*universalIdentifier: F\.isActive[\s\S]*?defaultValue: true/.test(rule)) problems.push('discountRule.isActive must be a checkbox defaulting to true');
  for (const f of ['maxDiscountPercent', 'minAgreementValueEur']) if (!new RegExp(`number\\(\\{\\s*universalIdentifier: F\\.${f}`).test(rule)) problems.push(`discountRule.${f} must be a number`);

  // Relations, linked both ways: [file, needle, what].
  const linked = [
    ['src/objects/agreement-line.object.ts', 'IDS.offering.fields.agreementLines', 'agreementLine.offering → offering.agreementLines'],
    ['src/objects/offering.object.ts', 'IDS.agreementLine.fields.offering', 'offering.agreementLines ← agreementLine.offering'],
    ['src/objects/agreement-line.object.ts', 'IDS.pricePoint.fields.agreementLines', 'agreementLine.pricePoint → pricePoint.agreementLines'],
    ['src/objects/price-point.object.ts', 'IDS.agreementLine.fields.pricePoint', 'pricePoint.agreementLines ← agreementLine.pricePoint'],
    ['src/objects/agreement-line.object.ts', 'IDS.clientPriceAgreement.fields.lines', 'agreementLine.agreement → clientPriceAgreement.lines'],
    ['src/objects/client-price-agreement.object.ts', 'IDS.agreementLine.fields.agreement', 'clientPriceAgreement.lines ← agreementLine.agreement'],
    ['src/objects/client-price-agreement.object.ts', 'IDS.company.fields.clientPriceAgreements', 'clientPriceAgreement.client → company.clientPriceAgreements'],
    ['src/objects/company/client-price-agreements.field.ts', 'IDS.clientPriceAgreement.fields.client', 'company.clientPriceAgreements ← clientPriceAgreement.client'],
    ['src/objects/client-price-agreement.object.ts', 'IDS.person.fields.clientPriceAgreements', 'clientPriceAgreement.contact → person.clientPriceAgreements'],
    ['src/objects/person/client-price-agreements.field.ts', 'IDS.clientPriceAgreement.fields.contact', 'person.clientPriceAgreements ← clientPriceAgreement.contact'],
    ['src/objects/person/signed-client-price-agreements.field.ts', 'IDS.clientPriceAgreement.fields.signedBy', 'person.signedClientPriceAgreements ← clientPriceAgreement.signedBy'],
    ['src/objects/opportunity/client-price-agreements.field.ts', 'IDS.clientPriceAgreement.fields.opportunity', 'opportunity.clientPriceAgreements ← clientPriceAgreement.opportunity'],
    ['src/objects/workspace-member/prepared-client-price-agreements.field.ts', 'IDS.clientPriceAgreement.fields.preparedBy', 'workspaceMember ← clientPriceAgreement.preparedBy'],
    ['src/objects/discount-rule.object.ts', 'IDS.offering.fields.discountRules', 'discountRule.offering → offering.discountRules'],
    ['src/objects/offering.object.ts', 'IDS.discountRule.fields.offering', 'offering.discountRules ← discountRule.offering'],
    ['src/objects/discount-rule.object.ts', 'STANDARD.workspaceMember.object', 'discountRule.approver → WorkspaceMember'],
    ['src/objects/workspace-member/discount-rules-to-approve.field.ts', 'IDS.discountRule.fields.approver', 'workspaceMember.discountRulesToApprove ← discountRule.approver'],
    ['src/objects/opportunity-line.object.ts', 'IDS.arMandate.fields.opportunityLines', 'opportunityLine.arMandate → arMandate.opportunityLines'],
    ['src/objects/ar-mandate.object.ts', 'IDS.opportunityLine.fields.arMandate', 'arMandate.opportunityLines ← opportunityLine.arMandate'],
    ['src/objects/opportunity-line.object.ts', 'IDS.trainingRegistration.fields.opportunityLines', 'opportunityLine.trainingRegistration → trainingRegistration.opportunityLines'],
    ['src/objects/training-registration.object.ts', 'IDS.opportunityLine.fields.trainingRegistration', 'trainingRegistration.opportunityLines ← opportunityLine.trainingRegistration'],
  ];
  for (const [file, needle, what] of linked) if (!existsSync(join(ROOT, file)) || !read(file).includes(needle)) problems.push(`relation not linked: ${what}`);

  // The seed as REST records: offerings `o-<code>`, price points `p-<correlationId>`.
  const offerings = p.OFFERINGS.map((o) => ({ ...o, id: `o-${o.offeringCode}` }));
  const pricePoints = p.OFFERINGS.flatMap((o) => o.pricePoints.map((pp) => ({ ...pp, id: `p-${pp.correlationId}`, offeringId: `o-${o.offeringCode}` })));
  const bundleItems = p.BUNDLE_ITEMS.map((b, i) => ({ id: `b${i}`, bundleId: `o-${b.bundle}`, componentId: `o-${b.component}`, included: b.included, sortOrder: b.sortOrder }));
  const records = { offerings, pricePoints, bundleItems };
  const line = (name, code, correlationId, extra = {}) => ({ id: name, name, offeringId: `o-${code}`, pricePointId: correlationId ? `p-${correlationId}` : null, ...extra });
  const members = [{ id: 'm1', name: { firstName: 'Ada', lastName: 'Lovelace' } }, { id: 'm2', name: { firstName: 'Grace', lastName: 'Hopper' } }];
  const global10 = { id: 'r1', name: 'Global 10%', offeringId: null, maxDiscountPercent: 10, approverId: 'm1', minAgreementValueEur: null, isActive: true };
  const validate = (lines, rules) => a.validateAgreementDiscounts({ ...records, lines, rules, members });

  // Discount vs the list price, over the global rule.
  let v = validate([line('AR', 'AR', 'ar-beginner-2026', { agreedPriceEur: 200 }), line('EPREL', 'EPREL_REGISTRATION', null, { agreedPriceEur: 475 })], [global10]);
  same(v.violations.map((x) => [x.lineName, x.maxAllowedPercent, x.actualPercent, x.requiresApprover]), [['AR', 10, 20, 'Ada Lovelace']], 'AR at 200 of 250 breaks the 10% rule; EPREL (single price point, 5%) does not');
  same([v.requiresApproval, v.agreementValueEur], [true, 675], 'requiresApproval + agreement value');
  // AR + DPP at the bundle price: 15% off list is the standard price, so no approval.
  v = validate([line('AR', 'AR', 'ar-boost-2026', { agreedPriceEur: 1020 }), line('DPP', 'DPP_SUBSCRIPTION', 'dpp-boost-2026', { agreedPriceEur: 2125 })], [global10]);
  same([v.requiresApproval, v.lines.map((l) => [l.bundleDiscountPercent, l.standardPriceEur, l.discountPercent, l.listDiscountPercent])], [false, [[15, 1020, 0, 15], [15, 2125, 0, 15]]], 'AR + DPP bundle −15% is standard pricing');
  // A further 10% on top of the bundle is still within 10%; 12% is not.
  v = validate([line('AR', 'AR', 'ar-boost-2026', { discountPercent: 12 }), line('DPP', 'DPP_SUBSCRIPTION', 'dpp-boost-2026', { discountPercent: 10 })], [global10]);
  same(v.violations.map((x) => [x.lineName, x.actualPercent]), [['AR', 12]], 'stored discountPercent applies on top of the bundle price');
  same(v.lines[0].agreedPriceEur, 897.6, 'AR Boost agreed = 1200 × 0.85 × 0.88');
  // The offering's own rule beats the global one; inactive rules are ignored.
  const ar25 = { id: 'r2', name: 'AR 25%', offeringId: 'o-AR', maxDiscountPercent: 25, approverId: 'm2', minAgreementValueEur: null, isActive: true };
  const inactive0 = { id: 'r3', name: 'Off', offeringId: null, maxDiscountPercent: 0, approverId: 'm2', minAgreementValueEur: null, isActive: false };
  v = validate([line('AR', 'AR', 'ar-beginner-2026', { agreedPriceEur: 200 }), line('EPREL', 'EPREL_REGISTRATION', null, { agreedPriceEur: 400 })], [global10, ar25, inactive0]);
  same(v.violations.map((x) => [x.lineName, x.ruleName, x.requiresApprover]), [['EPREL', 'Global 10%', 'Ada Lovelace']], 'offering rule beats global; inactive rule ignored');
  // Value thresholds: big agreements fall under the more generous rule.
  const big30 = { id: 'r4', name: 'Big deals 30%', offeringId: null, maxDiscountPercent: 30, approverId: 'm2', minAgreementValueEur: 2000, isActive: true };
  const seats = (quantity) => [line('Seats', 'TRAINING_LIVE', 'training-live-2026', { agreedPriceEur: 120, quantity })];
  same(validate(seats(5), [global10, big30]).violations.map((x) => x.ruleName), ['Global 10%'], '5 seats (€600) → the 10% rule');
  same(validate(seats(20), [global10, big30]).violations, [], '20 seats (€2400) → the 30% rule allows 20%');
  same(validate(seats(20), [global10, big30]).agreementValueEur, 2400, 'agreement value = agreed × quantity');
  // No rule: unrestricted. A price point of another offering: a problem.
  same(validate(seats(1), []).requiresApproval, false, 'no rule → no approval');
  v = validate([line('Wrong', 'AR', 'dpp-beginner-2026', { agreedPriceEur: 100 })], [global10]);
  if (!v.problems.some((x) => /another offering/.test(x.problem))) problems.push('a price point of another offering must be reported');
  if (!v.unchecked.length) problems.push('a line without a usable list price or stored discount must be unchecked');
  same(a.governingRule([global10, big30, ar25], 'o-AR', 5000)?.id, 'r2', 'governingRule: offering rule first even below a bigger global');
  same(a.discountPercent(250, 300), -20, 'a price above list is a negative discount');

  // Quote from an opportunity: Boost tier, bundle, a per-seat line, an on-request line, a line without offering.
  const opportunityLines = [
    { id: 'l1', name: 'AR', offeringId: 'o-AR', isActive: true },
    { id: 'l2', name: 'DPP', offeringId: 'o-DPP_SUBSCRIPTION', isActive: true },
    { id: 'l3', name: 'Training', offeringId: 'o-TRAINING_LIVE', isActive: true },
    { id: 'l4', name: 'Boss', offeringId: 'o-BOSS', isActive: true },
    { id: 'l5', name: 'Old', offeringId: 'o-EPREL_REGISTRATION', isActive: false },
    { id: 'l6', name: 'Unpriced', offeringId: null, isActive: true },
  ];
  const now = new Date('2026-10-04T12:00:00Z');
  let q = a.quoteFromOpportunity({ opportunity: { id: 'opp-1', name: 'Acme 2027', tier: 'BOOST' }, opportunityLines, ...records, company: { id: 'c1', name: 'Acme', tier: 'BEGINNER' } }, { now });
  same(q.lines.map((l) => [l.offeringCode, l.unitPriceEur, l.discountPercent, l.unit, l.isOnRequest]), [['AR', 1020, 15, 'year', false], ['DPP_SUBSCRIPTION', 2125, 15, 'year', false], ['TRAINING_LIVE', 150, 0, 'seat', false], ['BOSS', null, 0, 'year', true]], 'opportunity quote lines (Boost, bundle, per seat, on request)');
  same(q.totals, { listEur: 3850, discountEur: 555, netEur: 3295, setupFeesEur: 0, totalEur: 3295, hasOnRequestItems: true }, 'opportunity quote totals');
  same([q.tier, q.bundles, q.validUntil, q.warnings.length], ['BOOST', [{ offeringCode: 'AR_DPP_BUNDLE', components: ['AR', 'DPP_SUBSCRIPTION'], discountPercent: 15 }], '2026-11-03', 1], 'opportunity quote tier / bundles / validity / warnings');
  q = a.quoteFromOpportunity({ opportunity: { id: 'opp-2' }, opportunityLines: opportunityLines.slice(0, 1), ...records, company: { id: 'c1', tier: 'BUILDER' } }, { now });
  same([q.tier, q.lines[0].unitPriceEur, q.lines[0].discountPercent], ['BUILDER', 3000, 0], "no opportunity tier → the company's; AR alone has no bundle");
  // Quote from an agreement: as agreed, ended lines left out, valid to the end date.
  q = a.quoteFromAgreement({
    agreement: { id: 'cpa-1', name: 'Acme', agreementCode: 'CPA-2026-001', agreementType: 'VOLUME_DISCOUNT', status: 'ACTIVE', endDate: '2027-09-30' },
    lines: [...seats(20), line('Old', 'EPREL_REGISTRATION', null, { agreedPriceEur: 1, effectiveUntil: '2026-01-31' }), line('Boss', 'BOSS', 'boss-2026', { agreedPriceEur: 9000, discountRationale: 'Custom scope' })],
    ...records,
  }, { now });
  same([q.quoteNumber, q.validUntil, q.lines.map((l) => [l.name, l.quantity, l.unitPriceEur, l.lineTotalEur, l.discountPercent]), q.totals.totalEur, q.totals.hasOnRequestItems], ['Q-CPA-2026-001-20261004', '2027-09-30', [['Seats', 20, 120, 2400, 20], ['Boss', 1, 9000, 9000, 0]], 11400, false], 'agreement quote');

  // Preview: the agreement's prices over the published pricing.json.
  const published = p.buildPublicPricing(records, { now, version: '2026-10-04.1' });
  const preview = a.applyAgreementToPricing(published, {
    agreement: { id: 'cpa-1', agreementCode: 'CPA-2026-001' },
    lines: [
      line('AR Beginner', 'AR', 'ar-beginner-2026', { agreedPriceEur: 200 }),
      line('DPP −10%', 'DPP_SUBSCRIPTION', null, { discountPercent: 10 }),
      line('Future', 'EPREL_REGISTRATION', null, { agreedPriceEur: 1, effectiveFrom: '2027-01-01' }),
      line('Ghost', 'NOPE', null, { agreedPriceEur: 1 }),
    ],
    offerings,
    pricePoints,
  }, { now });
  const fee = (code, cid) => preview.pricing.offerings.find((o) => o.offeringCode === code).pricePoints.find((x) => x.correlationId === cid).annualFeeEur;
  same([fee('AR', 'ar-beginner-2026'), fee('AR', 'ar-boost-2026'), fee('DPP_SUBSCRIPTION', 'dpp-beginner-2026'), fee('DPP_SUBSCRIPTION', 'dpp-builder-2026'), fee('DPP_SUBSCRIPTION', 'dpp-boss-2026'), fee('EPREL_REGISTRATION', 'eprel-registration-2026')], [200, 1200, 855, 5400, null, 500], 'preview fees');
  same([preview.pricing.version, preview.applied.length, preview.skipped.map((x) => x.lineName)], ['2026-10-04.1+CPA-2026-001', 4, ['DPP −10%', 'Future', 'Ghost']], 'preview version / applied / skipped (dpp-boss on request, future line, unknown offering)');
  if (!p.PublicPricingV1.safeParse(preview.pricing).success) problems.push('the preview must pass PublicPricingV1');
  if (published.offerings.find((o) => o.offeringCode === 'AR').pricePoints[0].annualFeeEur !== 250) problems.push('applyAgreementToPricing must not mutate its input');
  same([a.previewBranch('CPA-2026-001'), a.previewBranch(' CPA 2026/001.. ')], ['pricing-preview/CPA-2026-001', 'pricing-preview/CPA-2026-001'], 'preview branch names');

  // Mandate → offerings → opportunity lines.
  same(a.mandateOfferings([{ category: 'BATTERY_LMT', dppStatus: 'DRAFT' }]).map((x) => x.offeringCode), ['AR', 'DPP_SUBSCRIPTION', 'BATTERY_PASSPORT'], 'battery product with a DPP → AR + DPP + battery passport');
  same(a.mandateOfferings([{ category: 'TEXTILES', dppStatus: 'PUBLISHED' }, { category: 'BATTERY_LI_ION', dppStatus: 'NONE' }]).map((x) => x.offeringCode), ['AR', 'DPP_SUBSCRIPTION'], 'DPP on textiles, battery without DPP → AR + DPP');
  same(a.mandateOfferings([]).map((x) => x.offeringCode), ['AR'], 'no products → AR');
  same([a.mandateFeeEur({ annualFee: { amountMicros: '300000000', currencyCode: 'EUR' } }), a.mandateFeeEur({ annualFee: { amountMicros: 1e8, currencyCode: 'USD' } }), a.mandateFeeEur({ annualFee: { amountMicros: null } })], [300, null, null], 'mandate fee from micros');
  const mandate = { id: 'man-1', name: 'Acme AR 2027', annualFee: { amountMicros: 300_000_000, currencyCode: 'EUR' } };
  const products = [{ category: 'BATTERY_LMT', dppStatus: 'DRAFT' }];
  const planArgs = { mandate, products, opportunityId: 'opp-1', offerings, pricePoints, bundleItems, tier: 'BUILDER', streamId: 's-lmt', today: '2026-10-04' };
  let plan = a.planMandateLines({ ...planArgs, existingLines: [{ id: 'ol-dpp', opportunityId: 'opp-1', offeringId: 'o-DPP_SUBSCRIPTION', arMandateId: null, estimatedValueEur: 5000, streamId: 's-lmt' }] });
  same(plan.create.map((c) => [c.offeringCode, c.estimatedValueEur, c.priceSource, c.data.arMandateId, c.data.streamId]), [['AR', 300, 'mandate fee', 'man-1', 's-lmt'], ['BATTERY_PASSPORT', 1500, 'price list', 'man-1', 's-lmt']], 'mandate plan creates AR (mandate fee) + battery passport');
  same(plan.update.map((u) => [u.id, u.patch]), [['ol-dpp', { arMandateId: 'man-1', estimatedValueEur: 5100 }]], 'mandate plan links the existing DPP line at Builder less 15%');
  const after = [...plan.create.map((c, i) => ({ id: `new-${i}`, ...c.data })), { id: 'ol-dpp', opportunityId: 'opp-1', offeringId: 'o-DPP_SUBSCRIPTION', arMandateId: 'man-1', estimatedValueEur: 5100, streamId: 's-lmt' }];
  plan = a.planMandateLines({ ...planArgs, existingLines: after });
  same([plan.create.length, plan.update.length, plan.unchanged.length], [0, 0, 3], 'a second mandate run writes nothing');
  plan = a.planMandateLines({ ...planArgs, existingLines: after, agreementLines: [{ offeringId: 'o-BATTERY_PASSPORT', agreedPriceEur: 1200, quantity: 1, effectiveFrom: '2026-01-01' }] });
  same(plan.update.map((u) => [u.offeringCode, u.patch, u.priceSource]), [['BATTERY_PASSPORT', { estimatedValueEur: 1200 }, 'price agreement']], 'a binding agreement line prices the mandate line');
  same(a.planMandateLines({ ...planArgs, offerings: offerings.filter((o) => o.offeringCode !== 'BATTERY_PASSPORT'), existingLines: [] }).skipped.map((x) => x.offeringCode), ['BATTERY_PASSPORT'], 'a missing offering is skipped');
  same([
    a.pickOpportunity({ requestedId: 'x' }),
    a.pickOpportunity({ mandateLines: [{ opportunityId: 'o1' }, { opportunityId: 'o1' }] }),
    a.pickOpportunity({ mandateLines: [{ opportunityId: 'o1' }, { opportunityId: 'o2' }] }).error,
    a.pickOpportunity({ companyOpportunities: [{ id: 'o1', stage: 'LOST' }, { id: 'o2', stage: 'TRIAL' }], closedStages: ['LOST'] }),
    a.pickOpportunity({ companyOpportunities: [] }).error,
  ], [{ opportunityId: 'x' }, { opportunityId: 'o1' }, 'ambiguous_opportunity', { opportunityId: 'o2' }, 'opportunity_not_found'], 'pickOpportunity');

  // Functions, scripts, views, layout, nav.
  for (const f of ['src/functions/validate-agreement-discounts.ts', 'src/functions/link-mandate-pricing.ts', 'ops/build-quote.mjs', 'ops/trigger-preview.mjs', 'src/front-components/ValidateDiscountsButton.tsx']) if (!existsSync(join(ROOT, f))) problems.push(`${f} is missing`);
  const validator = read('src/functions/validate-agreement-discounts.ts');
  if (!validator.includes('validateAgreementDiscounts(') || /\b(createRecord|updateRecord)\b/.test(validator)) problems.push('validate-agreement-discounts must use validateAgreementDiscounts and write nothing (its token sits in the browser)');
  if (!read('src/functions/link-mandate-pricing.ts').includes('planMandateLines(')) problems.push('link-mandate-pricing must plan with planMandateLines');
  const previewSrc = read('ops/trigger-preview.mjs');
  const dryReturn = previewSrc.indexOf('if (dryRun) {');
  if (dryReturn < 0 || previewSrc.indexOf('await commitPreview(') < dryReturn || !/const gh = dryRun \? null : githubFromEnv\(\)/.test(previewSrc)) problems.push('trigger-preview --dry-run must return before any GitHub call');
  if (!read('ops/build-quote.mjs').includes('quoteFromOpportunity(') || !read('ops/build-quote.mjs').includes('quoteFromAgreement(')) problems.push('build-quote must quote agreements and opportunities');
  const views = {
    'client-price-agreements-table': ['A', ['agreementCode', 'client', 'status', 'agreementType', 'startDate']],
    'agreement-lines-table': ['L', ['agreement', 'offering', 'pricePoint', 'agreedPriceEur', 'discountPercent']],
    'discount-rules-table': ['R', ['name', 'offering', 'maxDiscountPercent', 'approver']],
  };
  for (const [file, [alias, cols]] of Object.entries(views)) {
    const src = read(`src/views/${file}.view.ts`);
    if (!/type: ViewType\.TABLE,/.test(src)) problems.push(`${file} must be a TABLE view`);
    for (const c of cols) if (!src.includes(`[${alias}.${c},`)) problems.push(`${file} lacks ${c}`);
  }
  if (!/type: ViewType\.TABLE_WIDGET/.test(read('src/views/client-price-agreement-lines.view.ts'))) problems.push('client-price-agreement-lines must be a TABLE_WIDGET view');
  const layout = read('src/page-layouts/client-price-agreement-record.page-layout.ts');
  for (const tab of ["'Overview'", "'Lines'", "'Validation'"]) if (!layout.includes(`title: ${tab}`)) problems.push(`client price agreement page lacks the ${tab} tab`);
  if (!layout.includes('IDS.frontComponents.validateDiscountsButton') || !layout.includes('IDS.views.clientPriceAgreementLinesWidget.view')) problems.push('client price agreement page needs the lines table and the validate button');
  if (!/type: NavigationMenuItemType\.FOLDER/.test(read('src/navigation/pricing-folder.nav.ts'))) problems.push('pricing-folder.nav.ts must be a FOLDER');
  for (const [file, view] of [['pricing', 'offeringsTable'], ['client-price-agreements', 'clientPriceAgreementsTable'], ['discount-rules', 'discountRulesTable']]) {
    const src = read(`src/navigation/${file}.nav.ts`);
    if (!src.includes(`IDS.views.${view}.view`) || !src.includes('folderUniversalIdentifier: IDS.navigation.pricingFolder')) problems.push(`${file}.nav.ts must open ${view} inside the Pricing folder`);
  }
  if (!read('src/index.ts').includes('DISCOUNT_CHECK_TOKEN')) problems.push('src/index.ts must declare the DISCOUNT_CHECK_TOKEN app variable');

  if (problems.length) fail(`C2 client price agreements: ${problems.join('; ')}`);
  else ok('C2 client price agreements: ClientPriceAgreement / AgreementLine / DiscountRule fields + 21 relations linked both ways (AgreementLine → Offering + PricePoint, OpportunityLine → ArMandate + TrainingRegistration); discount maths (bundle = standard, rule precedence, value thresholds, approvers); opportunity + agreement quotes; preview overlay on pricing.json; mandate → offerings → lines, idempotent; views, 3-tab layout, Pricing folder nav');
}
// ------------------------------------------- 24. E3 ticket management
{
  const problems = [];
  const declaredIn = (file) => [...stripComments(read(file)).matchAll(/\bname: '([A-Za-z]+)',\s*\n(?:\s*relative: true,\s*\n)?\s*label:/g)].map((m) => m[1]);

  const enquiryFields = declaredIn('src/objects/enquiry.object.ts');
  for (const f of ['assignedTo', 'priority', 'tags', 'slaTarget', 'firstResponseAt', 'lastActivityAt', 'resolution', 'satisfaction', 'sourceUrl', 'internalNotes']) {
    if (!enquiryFields.includes(f)) problems.push(`Enquiry lacks ${f}`);
  }
  if (!declaredIn('src/objects/enquiry-message.object.ts').includes('messageId')) problems.push('EnquiryMessage lacks messageId (email-to-ticket dedupe key)');
  if (!/uniqueText\(\{\s*universalIdentifier: F\.messageId/.test(read('src/objects/enquiry-message.object.ts'))) problems.push('EnquiryMessage.messageId must be uniqueText');

  const PLAN_FIELDS = {
    'src/objects/ticket-macro.object.ts': ['name', 'shortcut', 'responseTemplate', 'category', 'appendSignature', 'productCategory', 'serviceInterest'],
    'src/objects/sla-policy.object.ts': ['name', 'description', 'priority', 'firstResponseHours', 'resolutionHours', 'isActive'],
  };
  for (const [file, names] of Object.entries(PLAN_FIELDS)) {
    if (!existsSync(join(ROOT, file))) { problems.push(`${file} missing`); continue; }
    const declared = declaredIn(file);
    const missing = names.filter((n) => !declared.includes(n));
    const extra = declared.filter((n) => !names.includes(n));
    if (missing.length || extra.length) problems.push(`${file}: fields missing [${missing}] extra [${extra}]`);
  }

  for (const file of ['staff-ticket-inbox', 'my-tickets', 'overdue-tickets']) {
    if (!existsSync(join(ROOT, `src/views/${file}.view.ts`))) problems.push(`src/views/${file}.view.ts missing`);
  }
  const inbox = read('src/views/staff-ticket-inbox.view.ts');
  if (!/IS_NOT,\s*\n\s*value: \['CLOSED', 'SPAM'\]/.test(inbox)) problems.push('staff ticket inbox must filter out CLOSED and SPAM');
  if (!/E\.priority,\s*\n\s*direction: ViewSortDirection\.DESC/.test(inbox) || !/E\.slaTarget,\s*\n\s*direction: ViewSortDirection\.ASC/.test(inbox)) problems.push('staff ticket inbox must sort priority DESC, slaTarget ASC');
  if (!/IS_IN_PAST/.test(read('src/views/overdue-tickets.view.ts'))) problems.push('overdue tickets must filter slaTarget in the past');
  if (!/E\.assignedTo/.test(read('src/views/my-tickets.view.ts'))) problems.push('my tickets must filter on assignedTo');

  const layout = read('src/page-layouts/enquiry-record.page-layout.ts');
  for (const tab of ["'Thread'", "'Details'", "'Macros'"]) if (!layout.includes(`title: ${tab}`)) problems.push(`enquiry-record page layout lacks the ${tab} tab`);
  for (const w of ['enquiryActionsBar', 'applyMacroPanel']) if (!layout.includes(w)) problems.push(`enquiry-record page layout lacks ${w}`);
  for (const c of ['TicketStatsWidget', 'EnquiryActionsBar', 'ApplyMacroPanel']) {
    if (!existsSync(join(ROOT, `src/front-components/${c}.tsx`))) problems.push(`src/front-components/${c}.tsx missing`);
  }
  if (!read('src/page-layouts/today-dashboard.page-layout.ts').includes('ticketStatsWidget')) problems.push('Today dashboard lacks the ticket stats widget');
  if (!existsSync(join(ROOT, 'src/functions/email-to-ticket.ts'))) problems.push('src/functions/email-to-ticket.ts missing');

  const sla = await import(pathToFileURL(join(ROOT, 'shared/sla.mjs')).href);
  const want = { URGENT: [1, 8], HIGH: [4, 24], NORMAL: [8, 48], LOW: [24, 96] };
  for (const [priority, [first, resolution]] of Object.entries(want)) {
    const p = sla.DEFAULT_SLA_POLICIES.find((x) => x.priority === priority);
    if (!p || p.firstResponseHours !== first || p.resolutionHours !== resolution || !p.isActive) problems.push(`SLA default ${priority} must be ${first}h/${resolution}h`);
  }
  if (new Set(sla.DEFAULT_SLA_POLICIES.map((p) => p.name)).size !== 4) problems.push('SLA policy names must be unique (seed key)');
  const t0 = new Date('2026-10-04T08:00:00Z');
  if (sla.slaTargetFor('HIGH', [], t0) !== '2026-10-04T12:00:00.000Z') problems.push('slaTargetFor(HIGH) must be created + 4h');
  if (sla.slaTargetFor('NORMAL', [{ priority: 'NORMAL', firstResponseHours: 2, isActive: true }], t0) !== '2026-10-04T10:00:00.000Z') problems.push('slaTargetFor must prefer the CRM policy');
  if (sla.slaTargetFor('NORMAL', [{ priority: 'NORMAL', firstResponseHours: 2, isActive: false }], t0) !== '2026-10-04T16:00:00.000Z') problems.push('slaTargetFor must ignore an inactive policy');

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(sla.parseSender('"Li Wei" <Li.Wei@Acme-Battery.cn>'), { name: 'Li Wei', email: 'li.wei@acme-battery.cn' })) problems.push('parseSender: display name + address');
  if (!same(sla.parseSender('sales@acme.cn'), { name: '', email: 'sales@acme.cn' })) problems.push('parseSender: bare address');
  if (sla.parseSender('nonsense').email !== '') problems.push('parseSender must reject a non-address');
  if (sla.contactNameFor({ name: '', email: 'li.wei@acme.cn' }) !== 'Li Wei') problems.push('contactNameFor: local part fallback');
  if (!same(sla.messageIds('<a@x> <b@y>,  c@z'), ['a@x', 'b@y', 'c@z'])) problems.push('messageIds must strip angle brackets');
  if (sla.referenceInSubject('Re: [ENQ-261003-7K2Q] Your enquiry') !== 'ENQ-261003-7K2Q' || sla.referenceInSubject('hello') !== null) problems.push('referenceInSubject');
  if (sla.cleanSubject('Re: RE: Fwd: DPP question') !== 'DPP question') problems.push('cleanSubject');
  if (sla.detectLanguage('请问你们提供欧代服务吗？ DPP') !== 'ZH' || sla.detectLanguage('Do you offer DPP?') !== 'EN') problems.push('detectLanguage');
  const rules = [
    { name: 'catch-all', priority: 9, isActive: true, assignToId: 'c' },
    { name: 'zh', language: 'ZH', priority: 2, isActive: true, assignToId: 'z' },
    { name: 'off', priority: 0, isActive: false, assignToId: 'o' },
    { name: 'dpp', category: 'DPP', priority: 1, isActive: true, assignToId: 'd' },
  ];
  if (sla.pickRoutingRule(rules, { language: 'ZH' })?.assignToId !== 'z') problems.push('pickRoutingRule: lowest priority number among matches, inactive skipped');
  if (sla.pickRoutingRule(rules, { language: 'EN' })?.assignToId !== 'c') problems.push('pickRoutingRule: falls back to the catch-all');
  if (sla.pickRoutingRule([], { language: 'EN' }) !== null) problems.push('pickRoutingRule: no rules → null');
  if (sla.statusAfterInbound('PENDING') !== 'OPEN' || sla.statusAfterInbound('CLOSED') !== 'OPEN' || sla.statusAfterInbound('NEW') !== 'NEW' || sla.statusAfterInbound('SPAM') !== 'SPAM') problems.push('statusAfterInbound');

  const optionsSource = read('src/options.ts');
  const statuses = [...(/export const ENQUIRY_STATUS = options\(\[([\s\S]*?)\]\);/.exec(optionsSource)?.[1] ?? '').matchAll(/\['([A-Z_]+)',/g)].map((m) => m[1]);
  const priorities = [...(/export const ENQUIRY_PRIORITY = options\(\[([\s\S]*?)\]\);/.exec(optionsSource)?.[1] ?? '').matchAll(/\['([A-Z_]+)',/g)].map((m) => m[1]);
  if (!same(priorities, sla.PRIORITIES)) problems.push(`ENQUIRY_PRIORITY [${priorities}] ≠ shared/sla.mjs PRIORITIES`);
  for (const status of ['OPEN', 'PENDING', 'CLOSED']) if (!statuses.includes(status)) problems.push(`ENQUIRY_STATUS lacks ${status} (used by email-to-ticket)`);

  const tm = await import(pathToFileURL(join(ROOT, 'shared/ticket-macros.mjs')).href);
  const base = ['Acknowledge receipt', 'Canton Fair follow-up', 'Request more info', 'Schedule call'];
  for (const name of base) for (const lang of ['EN', 'ZH']) {
    if (!tm.TICKET_MACROS.some((m) => m.name === `${name} · ${lang}`)) problems.push(`macro seed lacks "${name} · ${lang}"`);
  }
  if (new Set(tm.TICKET_MACROS.map((m) => m.name)).size !== tm.TICKET_MACROS.length) problems.push('macro names must be unique (seed key)');
  if (new Set(tm.TICKET_MACROS.map((m) => m.shortcut)).size !== tm.TICKET_MACROS.length) problems.push('macro shortcuts must be unique');
  for (const m of tm.TICKET_MACROS) if (!tm.MACRO_CATEGORIES.includes(m.category)) problems.push(`macro ${m.name}: bad category ${m.category}`);
  const ack = tm.TICKET_MACROS.find((m) => m.name === 'Acknowledge receipt · EN');
  const rendered = tm.renderMacro(ack, { reference: 'ENQ-261003-7K2Q', name: 'Li Wei', company: 'Acme', category: 'DPP', language: 'EN' });
  if (!rendered.includes("We've received your enquiry (ENQ-261003-7K2Q) and will get back to you within 24 hours.") || !rendered.startsWith('Hello Li Wei,') || !rendered.includes('Integra Scientific')) problems.push('renderMacro (EN acknowledge) output is wrong');
  if (/\{\{/.test(tm.renderMacro(tm.TICKET_MACROS.find((m) => m.name === 'Schedule call · ZH'), { reference: 'R', name: '', company: '', category: 'OTHER', language: 'ZH' }))) problems.push('renderMacro leaves placeholders behind');
  if (!tm.macroApplies({ serviceInterest: null, category: 'RESPONSE' }, { category: 'DPP' }) || tm.macroApplies({ serviceInterest: 'AR', category: 'RESPONSE' }, { category: 'DPP' }) || tm.macroApplies({ serviceInterest: null, category: 'INTERNAL_ACTION' }, { category: 'DPP' })) problems.push('macroApplies');

  for (const file of ['ops/seed-ticket-macros.mjs', 'ops/seed-sla-policies.mjs']) if (!existsSync(join(ROOT, file))) problems.push(`${file} missing`);

  if (problems.length) fail(`E3 ticket management: ${problems.join('; ')}`);
  else ok(`E3 ticket management: Enquiry ticket fields, TicketMacro + SlaPolicy, inbox / my / overdue views, Thread/Details/Macros tabs, ${sla.DEFAULT_SLA_POLICIES.length} SLA defaults, ${tm.TICKET_MACROS.length} EN/ZH macros; email-to-ticket sender parsing, threading ids, routing and status rules`);
}

// ------------------------------------------------- 24. B3 stream content
{
  const problems = [];
  const c = await import(pathToFileURL(join(ROOT, 'shared/stream-content.mjs')).href);
  const fieldNames = (file) => [...stripComments(read(file)).matchAll(/\bname: '([A-Za-z]+)',\s*\n\s*label:/g)].map((m) => m[1]);

  const declared = fieldNames('src/objects/stream-update.object.ts');
  for (const n of ['contentCategory', 'isPublished', 'publishUrl', 'engagementCount']) if (!declared.includes(n)) problems.push(`stream-update.object.ts lacks ${n}`);
  const updateSrc = stripComments(read('src/objects/stream-update.object.ts'));
  if (!/boolean\(\{\s*universalIdentifier: F\.isPublished/.test(updateSrc)) problems.push('isPublished must be a boolean (default false)');
  if (!/link\(\{\s*universalIdentifier: F\.publishUrl/.test(updateSrc)) problems.push('publishUrl must be a link field');
  const category = stripComments(read('src/options.ts')).match(/STREAM_CONTENT_CATEGORY = options\(\[([\s\S]*?)\]\);/);
  const values = category ? [...category[1].matchAll(/\['([A-Z_]+)'/g)].map((m) => m[1]).join(',') : '';
  if (values !== 'NEWS,REGULATORY,GUIDE,CASE_STUDY,MARKET_REPORT') problems.push(`STREAM_CONTENT_CATEGORY is [${values}]`);

  // Only https on integrascientific.com.
  for (const good of ['https://integrascientific.com/news/a', 'https://www.integrascientific.com/x?y=1', 'HTTPS://Blog.IntegraScientific.com/']) if (!c.integraUrl(good)) problems.push(`integraUrl rejects ${good}`);
  for (const bad of ['http://integrascientific.com/a', 'https://integrascientific.com.evil.example/a', 'https://evilintegrascientific.com/a', 'https://integrascientific.com@evil.example/a', 'https://user:pw@integrascientific.com/a', 'javascript:alert(1)', 'not a url', '', null]) if (c.integraUrl(bad)) problems.push(`integraUrl accepts ${bad}`);

  // Publish script: validates before the API, writes only when something changes.
  const publish = read('ops/publish-stream-content.mjs');
  if (!publish.includes('integraUrl(') || publish.indexOf('integraUrl(') > publish.indexOf('configFromEnv()')) problems.push('publish-stream-content must validate the URL before touching the API');
  if (!/isPublished === true && update\.publishUrl\?\.primaryLinkUrl === url/.test(publish)) problems.push('publish-stream-content must be a no-op when already published with that URL');

  // View, widget, layout, nav.
  const view = read('src/views/stream-content-report.view.ts');
  if (!/objectUniversalIdentifier: IDS\.streamUpdate\.object,/.test(view) || !/type: ViewType\.TABLE,/.test(view)) problems.push('stream-content-report must be a TABLE view on StreamUpdate');
  for (const col of ['name', 'contentCategory', 'publishedAt', 'engagementCount']) if (!view.includes(`[U.${col},`)) problems.push(`stream-content-report lacks ${col}`);
  const widget = read('src/front-components/StreamContentWidget.tsx');
  if (!widget.includes('fetchPublishedUpdates') || !widget.includes('integraUrl(')) problems.push('StreamContentWidget must fetch published updates and only link integraUrl()s');
  if (!/isPublished: \{ eq: true \}/.test(read('src/lib/data.ts'))) problems.push('fetchPublishedUpdates must filter on isPublished');
  if (!read('src/page-layouts/product-stream-record.page-layout.ts').includes('IDS.frontComponents.streamContentWidget')) problems.push('Product Stream page must show StreamContentWidget');
  if (!read('src/navigation/stream-content-report.nav.ts').includes('IDS.views.streamContentReport.view')) problems.push('Stream Content nav must open the report view');
  if (!JSON.parse(read('package.json')).scripts['stream-content:publish']) problems.push('package.json lacks stream-content:publish');

  if (problems.length) fail(`B3 stream content: ${problems.join('; ')}`);
  else ok('B3 stream content: StreamUpdate contentCategory (5 values) / isPublished / publishUrl / engagementCount placeholder; only https integrascientific.com URLs accepted (lookalikes, userinfo, http refused); idempotent publish script; report view, widget, nav');
}

// ------------------------------------------- 25. D3 competitive intel
{
  const problems = [];
  const ci = await import(pathToFileURL(join(ROOT, 'shared/competitive-intel.mjs')).href);
  const fieldNames = (file) => [...stripComments(read(file)).matchAll(/\bname: '([A-Za-z]+)',\s*\n\s*label:/g)].map((m) => m[1]);

  const declared = fieldNames('src/objects/competitor.object.ts');
  for (const n of ['priceObservationCount', 'riskLevel']) if (!declared.includes(n)) problems.push(`competitor.object.ts lacks ${n}`);

  // Risk rules (now = 2026-10-04).
  const now = new Date('2026-10-04T12:00:00Z');
  const cases = [
    [0, null, 'LOW'], [1, '2026-10-01', 'LOW'], [2, '2026-10-01', 'MEDIUM'], [4, '2026-07-10', 'MEDIUM'],
    [5, '2026-10-01', 'HIGH'], [5, '2026-07-10', 'HIGH'], [5, '2026-01-01', 'MEDIUM'], [3, '2026-01-01', 'LOW'],
  ];
  for (const [count, latest, want] of cases) if (ci.riskLevel(count, latest, now) !== want) problems.push(`riskLevel(${count}, ${latest}) = ${ci.riskLevel(count, latest, now)}, want ${want}`);
  const obs = [
    { observedAt: '2026-09-01', competitorPriceEur: 100, currencyCode: 'EUR' },
    { observedAt: '2026-10-02T08:00:00Z', competitorPriceEur: 201, currencyCode: 'EUR' },
    { observedAt: '2026-08-01', competitorPriceEur: 999, currencyCode: 'USD' },
  ];
  if (ci.latestObservationDate(obs) !== '2026-10-02') problems.push('latestObservationDate must be the newest date');
  if (ci.averageEur(obs) !== 150.5) problems.push('averageEur must ignore non-EUR observations');
  if (ci.averageEur([]) !== null) problems.push('averageEur of nothing must be null');
  const summary = ci.competitorSummary(obs, now);
  if (summary.priceObservationCount !== 3 || summary.riskLevel !== 'MEDIUM') problems.push('competitorSummary must count all observations');

  // CSV.
  const csv = ci.toCsv([{ name: 'Acme, "Inc"', website: '=HYPERLINK("x")', productStreams: 'DPP', latestObservationDate: '2026-10-02', priceObservationCount: 3, avgObservedPriceEur: 150.5, riskLevel: 'MEDIUM' }]).split('\n');
  if (csv[0] !== 'name,website,productStreams,latestObservationDate,priceObservationCount,avgObservedPriceEur,riskLevel') problems.push(`CSV header is ${csv[0]}`);
  if (csv[1] !== '"Acme, ""Inc""","\'=HYPERLINK(""x"")",DPP,2026-10-02,3,150.5,MEDIUM') problems.push(`CSV row is ${csv[1]}`);

  // Export script, ingest, view, layout.
  const exportSrc = read('ops/export-competitive-intel.mjs');
  if (!exportSrc.includes('competitive-intel-${today}.csv') || !exportSrc.includes('toCsv(')) problems.push('export-competitive-intel must write competitive-intel-<date>.csv via toCsv');
  if (!/competitorSummary\(all, now\)/.test(read('src/functions/research-ingest.ts'))) problems.push('research-ingest must refresh the Competitor summary fields');
  const view = read('src/views/competitive-intel-dashboard.view.ts');
  if (!/objectUniversalIdentifier: IDS\.competitor\.object,/.test(view) || !/type: ViewType\.TABLE,/.test(view)) problems.push('competitive-intel-dashboard must be a TABLE view on Competitor');
  for (const col of ['name', 'competitorOf', 'lastObservationAt', 'priceObservationCount', 'riskLevel']) if (!view.includes(`[C.${col},`)) problems.push(`competitive-intel-dashboard lacks ${col}`);
  if (!/fieldMetadataUniversalIdentifier: C\.riskLevel,/.test(view)) problems.push('competitive-intel-dashboard must sort by riskLevel');
  if (!/COMPETITOR_RISK_LEVEL = options\(\[\s*\['HIGH'[\s\S]*?\['MEDIUM'[\s\S]*?\['LOW'/.test(read('src/options.ts'))) problems.push('COMPETITOR_RISK_LEVEL must list HIGH, MEDIUM, LOW in that order (sort order)');
  const layout = read('src/page-layouts/product-stream-record.page-layout.ts');
  if (!layout.includes("title: 'Competitive Intel'") || !layout.includes('IDS.views.streamCompetitorsWidget.view') || !layout.includes('IDS.frontComponents.competitiveIntelWidget')) problems.push('Product Stream page needs the Competitive Intel tab (competitors table + observations widget)');
  if (!read('src/front-components/CompetitiveIntelWidget.tsx').includes('fetchStreamObservations')) problems.push('CompetitiveIntelWidget must fetch via fetchStreamObservations');
  if (!read('src/navigation/competitive-intel.nav.ts').includes('IDS.views.competitiveIntelDashboard.view')) problems.push('Competitive Intel nav must open the dashboard view');
  if (!JSON.parse(read('package.json')).scripts['competitive-intel:export']) problems.push('package.json lacks competitive-intel:export');

  if (problems.length) fail(`D3 competitive intel: ${problems.join('; ')}`);
  else ok('D3 competitive intel: Competitor priceObservationCount + riskLevel; risk rules (HIGH / MEDIUM / LOW by count and recency), EUR average, CSV (columns, quoting, formula defusing); dashboard sorted by risk, export script, ingest refreshes the summary, Competitive Intel tab');
}

// ----------------------------------------------------------------- report
for (const p of passes) console.log(`✓ ${p}`);
for (const f of failures) console.log(`✗ ${f}`);
console.log(failures.length ? `\n${failures.length} check(s) FAILED` : `\nall ${passes.length} checks passed`);
process.exit(failures.length ? 1 : 0);
