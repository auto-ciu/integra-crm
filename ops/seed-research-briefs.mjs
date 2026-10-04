#!/usr/bin/env node
/**
 * Create the starting ResearchBrief records (D1-D2): one per topic that has a
 * prompt in shared/research-prompts.mjs, scope "EU", depth "OVERVIEW", each
 * a DRAFT holding its prompt.
 *
 *   node ops/seed-research-briefs.mjs [--dry-run]
 *
 * Idempotent, keyed by topic + scope + depth: a brief that already exists,
 * whatever its status or title, is left exactly as it is; missing ones are
 * created. Nothing is submitted to Claude (BLOCKED: no Anthropic API key yet).
 */
import { DEFAULT_RESEARCH_DEPTH, DEFAULT_RESEARCH_SCOPE, RESEARCH_TOPICS, briefTitle, researchPrompt } from '../shared/research-prompts.mjs';
import { PRODUCT_STREAMS } from '../shared/streams.mjs';
import { TwentyApiError, configFromEnv, createRecord, findAllRecords, parseArgs } from './lib/twenty-api.mjs';

const key = (b) => `${b.topic}|${b.scope}|${b.depth}`;

async function main() {
  const dryRun = parseArgs(process.argv.slice(2))['dry-run'] === true;
  const config = configFromEnv();

  const existing = new Set((await findAllRecords(config, 'researchBriefs')).map(key));
  const wanted = PRODUCT_STREAMS.filter((s) => RESEARCH_TOPICS.includes(s.category)).map((s) => ({
    topic: s.category,
    scope: DEFAULT_RESEARCH_SCOPE,
    depth: DEFAULT_RESEARCH_DEPTH,
    title: briefTitle(s.name, DEFAULT_RESEARCH_SCOPE, DEFAULT_RESEARCH_DEPTH),
  }));
  const missing = wanted.filter((b) => !existing.has(key(b)));
  if (missing.length === 0) {
    console.log(`all ${wanted.length} research briefs exist — nothing to do`);
    return;
  }

  for (const b of missing) {
    console.log(`${dryRun ? '[dry-run] ' : ''}create ${b.title}`);
    if (dryRun) continue;
    await createRecord(config, 'researchBriefs', {
      title: b.title,
      topic: b.topic,
      scope: b.scope,
      depth: b.depth,
      prompt: { markdown: researchPrompt(b), blocknote: null },
      status: 'DRAFT',
      isVerified: false,
    });
  }
  console.log(`${dryRun ? 'would create' : 'created'} ${missing.length}, kept ${wanted.length - missing.length}`);
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`seed-research-briefs: ${error.message}${detail}`);
  process.exit(1);
});
