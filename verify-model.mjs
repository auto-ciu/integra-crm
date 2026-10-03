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
const DEFINE_CALL = /\b(define(?:Application|ApplicationRole|Object|Field|View|PageLayout|PageLayoutTab|PageLayoutWidget|FrontComponent|NavigationMenuItem))\(\{/g;

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
  if (objectFiles.length !== 4) fail(`expected 4 custom object files, found ${objectFiles.length}`);
  if (problems.length) fail(problems.join('; '));
  else ok(`${objectFiles.length} custom objects (ArMandate, MandateProduct, TrainingEvent, Authority) declare names, labels and a label identifier`);
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

// ----------------------------------------------------------------- report
for (const p of passes) console.log(`✓ ${p}`);
for (const f of failures) console.log(`✗ ${f}`);
console.log(failures.length ? `\n${failures.length} check(s) FAILED` : `\nall ${passes.length} checks passed`);
process.exit(failures.length ? 1 : 0);
