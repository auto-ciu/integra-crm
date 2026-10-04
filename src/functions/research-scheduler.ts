/**
 * research-scheduler — Lambda, D1-D2. Runs on a cron (EventBridge) or by hand
 * (POST `{ dryRun? }` with bearer OPS_TOKEN).
 *
 * For every ResearchBrief with nextRunAt ≤ now:
 *   1. Start a Claude Managed Agents session on the brief's agent
 *      (POST /v1/sessions) seeded with one `user.define_outcome`: the
 *      description is built from the brief's focus areas and watchlists plus
 *      the last 90 days of findings (so the agent does not repeat them), the
 *      rubric is shared/research-agent.mjs, and the session budget is $10.
 *      Anthropic hosts the agent loop and sandbox. The agent has no CRM
 *      credentials: it can only write report.md and findings.json, which
 *      research-ingest.ts reads back and validates.
 *   2. Move the brief on: lastRunAt = now, nextRunAt = now + cadenceDays.
 *   3. Create a ResearchReport (RUNNING) holding the session id.
 *
 * A brief with no agentId is skipped (the agent is created once, outside the
 * CRM). A failed session start is logged and leaves nextRunAt alone so the
 * next tick retries. Managed Agents is a beta; the header is pinned in
 * shared/research-agent.mjs.
 *
 * Returns `{ reportsCreated, briefIdsProcessed, skipped, errors }`.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (a role that can read/write
 * researchBriefs, researchReports, researchFindings), ANTHROPIC_API_KEY,
 * RESEARCH_ENVIRONMENT_ID (the Managed Agents environment), OPS_TOKEN.
 */
import { z } from 'zod';

import {
  TwentyApiError,
  configFromEnv,
  createRecord,
  findAllRecords,
  updateRecord,
  type TwentyConfig,
  type TwentyRecord,
} from '../../ops/lib/twenty-api';
import {
  DEDUPE_DAYS,
  DEFAULT_CADENCE_DAYS,
  RESEARCH_RUBRIC,
  RUN_BUDGET,
  buildOutcomeDescription,
} from '../../shared/research-agent.mjs';
import { ManagedAgentsError, createOutcomeSession } from './lib/managed-agents';
import { json, type HttpEvent, type HttpResult } from './lib/sidecar';
import { readTrigger } from './lib/trigger';

export const SchedulerPayload = z.object({ dryRun: z.boolean().default(false) });

export type SchedulerResult = {
  reportsCreated: number;
  briefIdsProcessed: string[];
  skipped: Array<{ briefId: string; reason: string }>;
  errors: Array<{ briefId: string; error: string }>;
  dryRun: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export type SchedulerEnv = { apiKey: string | undefined; environmentId: string | undefined };

/** Briefs whose turn has come (nextRunAt set and not in the future). */
export const isDue = (brief: TwentyRecord, now: Date) => {
  const next = typeof brief.nextRunAt === 'string' ? Date.parse(brief.nextRunAt) : NaN;
  return Number.isFinite(next) && next <= now.getTime();
};

export function nextRunAt(brief: TwentyRecord, now: Date): string {
  const days = Number(brief.cadenceDays);
  return new Date(now.getTime() + (days > 0 ? days : DEFAULT_CADENCE_DAYS) * DAY_MS).toISOString();
}

async function recentFindings(config: TwentyConfig, briefId: string, now: Date) {
  const since = new Date(now.getTime() - DEDUPE_DAYS * DAY_MS).toISOString();
  const filter = `and(briefId[eq]:${JSON.stringify(briefId)},createdAt[gte]:${JSON.stringify(since)})`;
  const rows = await findAllRecords(config, 'researchFindings', { filter, orderBy: 'createdAt[DescNullsLast]' });
  return rows.map((f) => ({
    title: String(f.title ?? ''),
    category: typeof f.category === 'string' ? f.category : undefined,
    publicationDate: typeof f.publicationDate === 'string' ? f.publicationDate : undefined,
  }));
}

export async function runScheduler(
  config: TwentyConfig,
  env: SchedulerEnv,
  { dryRun }: z.infer<typeof SchedulerPayload>,
  now = new Date(),
): Promise<SchedulerResult> {
  const result: SchedulerResult = { reportsCreated: 0, briefIdsProcessed: [], skipped: [], errors: [], dryRun };
  const due = (await findAllRecords(config, 'researchBriefs')).filter((b) => isDue(b, now));

  for (const brief of due) {
    const agentId = typeof brief.agentId === 'string' ? brief.agentId.trim() : '';
    if (!agentId) {
      result.skipped.push({ briefId: brief.id, reason: 'no agentId' });
      continue;
    }
    if (!env.apiKey || !env.environmentId) {
      result.skipped.push({ briefId: brief.id, reason: 'ANTHROPIC_API_KEY or RESEARCH_ENVIRONMENT_ID not configured' });
      continue;
    }
    if (dryRun) {
      result.briefIdsProcessed.push(brief.id);
      continue;
    }

    try {
      const title = String(brief.title ?? 'Research');
      const description = buildOutcomeDescription(brief, await recentFindings(config, brief.id, now));
      const session = await createOutcomeSession(env.apiKey, {
        agentId,
        environmentId: env.environmentId,
        title: `${title} — ${now.toISOString().slice(0, 10)}`,
        description,
        rubric: RESEARCH_RUBRIC,
        budget: RUN_BUDGET,
      });

      // Advance the brief before anything else can fail, so a retry never starts a second session.
      await updateRecord(config, 'researchBriefs', brief.id, { lastRunAt: now.toISOString(), nextRunAt: nextRunAt(brief, now) });
      await createRecord(config, 'researchReports', {
        name: `${title} — ${now.toISOString().slice(0, 10)}`,
        briefId: brief.id,
        status: 'RUNNING',
        sessionId: session.id,
        startedAt: now.toISOString(),
      });
      result.reportsCreated += 1;
      result.briefIdsProcessed.push(brief.id);
    } catch (error) {
      const message = error instanceof ManagedAgentsError ? `${error.message} ${JSON.stringify(error.body ?? '')}` : String(error);
      console.error('[research-scheduler]', brief.id, message);
      result.errors.push({ briefId: brief.id, error: message });
    }
  }
  return result;
}

export const handler = async (event?: HttpEvent): Promise<HttpResult | SchedulerResult> => {
  const trigger = readTrigger(event, process.env.OPS_TOKEN);
  if ('error' in trigger) return trigger.error;
  const parsed = SchedulerPayload.safeParse(trigger.body);
  if (!parsed.success) return json(400, { error: 'invalid_payload', issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });

  try {
    const result = await runScheduler(
      configFromEnv(),
      { apiKey: process.env.ANTHROPIC_API_KEY, environmentId: process.env.RESEARCH_ENVIRONMENT_ID },
      parsed.data,
    );
    return event?.requestContext?.http || event?.headers ? json(200, result) : result;
  } catch (error) {
    if (error instanceof TwentyApiError) {
      console.error('[research-scheduler]', { message: error.message, body: error.body });
      return json(502, { error: 'crm_unavailable' });
    }
    throw error;
  }
};
