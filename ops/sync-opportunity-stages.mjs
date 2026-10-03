#!/usr/bin/env node
/**
 * Replace the stock Opportunity stage set (New/Screening/Meeting/Proposal/
 * Customer) with the Integra pipeline from shared/stages.mjs.
 *
 * Why a script: an App manifest can ADD fields to standard objects but cannot
 * rewrite a standard field's options, and `stage` must stay the standard
 * field so both the stock "By Stage" kanban and our "Pipeline" kanban group
 * by it. This uses the metadata API (updateOneField), which is the same call
 * Settings → Data model makes.
 *
 *   node ops/sync-opportunity-stages.mjs [--dry-run]
 *
 * Idempotent: re-running with the options already in place does nothing.
 * Option ids are preserved for values that already exist so records keep
 * their stage. Records holding a value that is being REMOVED are reported and
 * the script refuses to proceed unless --force is given (migrate them first).
 */
import { DEFAULT_OPPORTUNITY_STAGE, OPPORTUNITY_STAGES } from '../shared/stages.mjs';
import {
  TwentyApiError,
  configFromEnv,
  findAllRecords,
  metadataGraphql,
  parseArgs,
} from './lib/twenty-api.mjs';

const FIND_STAGE_FIELD = `
  query IntegraFindOpportunityStage {
    objects(paging: { first: 500 }) {
      edges {
        node {
          nameSingular
          fieldsList { id name type options defaultValue }
        }
      }
    }
  }
`;

const UPDATE_FIELD = `
  mutation IntegraUpdateStageOptions($id: UUID!, $update: UpdateFieldInput!) {
    updateOneField(input: { id: $id, update: $update }) { id name options defaultValue }
  }
`;

const sameOptions = (a, b) =>
  a.length === b.length &&
  a.every((o, i) => o.value === b[i].value && o.label === b[i].label && o.color === b[i].color && o.position === b[i].position);

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const dryRun = flags['dry-run'] === true;
  const config = configFromEnv();

  const data = await metadataGraphql(config, FIND_STAGE_FIELD);
  const opportunity = (data?.objects?.edges ?? []).map((e) => e.node).find((o) => o.nameSingular === 'opportunity');
  const stage = opportunity?.fieldsList?.find((f) => f.name === 'stage');
  if (!stage) throw new TwentyApiError('opportunity.stage field not found via /metadata');

  const existing = stage.options ?? [];
  const byValue = new Map(existing.map((o) => [o.value, o]));
  const desired = OPPORTUNITY_STAGES.map((s) => ({
    ...(byValue.get(s.value)?.id ? { id: byValue.get(s.value).id } : {}),
    value: s.value,
    label: s.label,
    color: s.color,
    position: s.position,
  }));
  const desiredDefault = `'${DEFAULT_OPPORTUNITY_STAGE}'`;

  if (sameOptions(existing, desired) && stage.defaultValue === desiredDefault) {
    console.log('opportunity.stage already matches shared/stages.mjs — nothing to do');
    return;
  }

  const removed = existing.filter((o) => !OPPORTUNITY_STAGES.some((s) => s.value === o.value)).map((o) => o.value);
  if (removed.length > 0) {
    const orphaned = (await findAllRecords(config, 'opportunities')).filter((r) => removed.includes(r.stage));
    if (orphaned.length > 0) {
      console.log(`${orphaned.length} opportunit${orphaned.length === 1 ? 'y' : 'ies'} still use a stage being removed:`);
      for (const r of orphaned) console.log(`  ${r.name ?? r.id}: ${r.stage}`);
      if (flags.force !== true) {
        throw new TwentyApiError('refusing to remove stages still in use (re-stage them, or pass --force)');
      }
    }
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}opportunity.stage options:`);
  console.log(`  current: ${existing.map((o) => o.label).join(' → ') || '(none)'}`);
  console.log(`  desired: ${desired.map((o) => o.label).join(' → ')}  (default ${DEFAULT_OPPORTUNITY_STAGE})`);
  if (dryRun) return;

  await metadataGraphql(config, UPDATE_FIELD, {
    id: stage.id,
    update: { options: desired, defaultValue: desiredDefault },
  });
  console.log('updated');
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`sync-opportunity-stages: ${error.message}${detail}`);
  process.exit(1);
});
