/**
 * research-ingest — Lambda, D1-D2. Polling cron (every 15 minutes) or manual
 * (POST `{ dryRun? }` with bearer OPS_TOKEN).
 *
 * For every ResearchReport still RUNNING, ask Managed Agents about its
 * session. While the session runs, leave it (a report older than 12 hours is
 * marked FAILED). Once it is idle or terminated:
 *   1. Set the report INGESTING, list the session's files (Files API,
 *      scope_id = session) and download findings.json.
 *   2. Validate it with zod (lib/research-contract.ts): it is untrusted agent
 *      output and nothing unvalidated reaches the CRM. Invalid or missing →
 *      report FAILED with errorMessage.
 *   3. Create a ResearchFinding per finding. For HIGH ones create a Twenty
 *      Task for suggestedOwner (matched by e-mail) or the default assignee
 *      (RESEARCH_DEFAULT_ASSIGNEE_ID, a workspace member id), else unassigned.
 *   4. Upsert Competitors (by name) and add CompetitorPriceObservations
 *      (linked to our Offering by offeringCode when it matches).
 *   5. Set the report READY with findingsCount, cost, completedAt and
 *      reportUrl (the report.md file).
 *
 * Re-running is safe: a report is only ingested from RUNNING, and marked
 * INGESTING first, so a crash part-way leaves it INGESTING for a human rather
 * than ingesting twice.
 *
 * Returns `{ reportsIngested, findingsCreated, tasksCreated, reportsFailed }`.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (a role that can write the research
 * objects, competitors, tasks, taskTargets), ANTHROPIC_API_KEY, OPS_TOKEN,
 * RESEARCH_DEFAULT_ASSIGNEE_ID (optional).
 */
import { z } from 'zod';

import {
  TwentyApiError,
  configFromEnv,
  createRecord,
  eq,
  findAllRecords,
  findRecords,
  updateRecord,
  type TwentyConfig,
  type TwentyRecord,
} from '../../ops/lib/twenty-api';
import { competitorSummary } from '../../shared/competitive-intel.mjs';
import { STUCK_AFTER_HOURS } from '../../shared/research-agent.mjs';
import { PRODUCT_STREAMS } from '../../shared/streams.mjs';
import { downloadFile, fileName, getSession, isFinished, listSessionFiles, sessionCostUsd } from './lib/managed-agents';
import { FindingsFile } from './lib/research-contract';
import { json, type HttpEvent, type HttpResult } from './lib/sidecar';
import { readTrigger } from './lib/trigger';

export const IngestPayload = z.object({ dryRun: z.boolean().default(false) });

export type IngestResult = {
  reportsIngested: number;
  findingsCreated: number;
  tasksCreated: number;
  reportsFailed: number;
  dryRun: boolean;
};

const markdown = (text: string) => ({ markdown: text, blocknote: null });
const link = (url: string) => ({ primaryLinkUrl: url, primaryLinkLabel: '', secondaryLinks: null });

async function fail(config: TwentyConfig, report: TwentyRecord, message: string, now: Date) {
  console.warn('[research-ingest] failed', report.id, message);
  await updateRecord(config, 'researchReports', report.id, { status: 'FAILED', errorMessage: message.slice(0, 500), completedAt: now.toISOString() });
}

/** Parsed findings.json, or the reason it cannot be used. */
type Found = { data: FindingsFile; error?: undefined } | { error: string; data?: undefined };

async function readFindings(apiKey: string, files: Awaited<ReturnType<typeof listSessionFiles>>): Promise<Found> {
  const file = files.find((f) => fileName(f).split('/').pop() === 'findings.json');
  if (!file) return { error: 'findings.json not found in the session outputs' };
  let raw: unknown;
  try {
    raw = JSON.parse(await downloadFile(apiKey, file.id));
  } catch {
    return { error: 'findings.json is not valid JSON' };
  }
  const parsed = FindingsFile.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `findings.json failed validation: ${issue.path.join('.')} ${issue.message}` };
  }
  return { data: parsed.data };
}

async function memberIdByEmail(config: TwentyConfig, email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  const [member] = await findRecords(config, 'workspaceMembers', { filter: eq('userEmail', email), limit: 1 });
  return member?.id ?? null;
}

async function createTask(config: TwentyConfig, finding: { title: string; body: string; sourceUrls: string[] }, findingId: string, assigneeId: string | null) {
  const sources = finding.sourceUrls.map((u) => `- ${u}`).join('\n');
  const task = await createRecord(config, 'tasks', {
    title: `Research: ${finding.title}`.slice(0, 200),
    bodyV2: markdown(`${finding.body}\n\n**Sources**\n${sources}\n\n_Created by research-ingest from research finding ${findingId}._`),
    status: 'TODO',
    ...(assigneeId ? { assigneeId } : {}),
  });
  return task.id;
}

async function ingestReport(
  config: TwentyConfig,
  report: TwentyRecord,
  data: FindingsFile,
  files: Awaited<ReturnType<typeof listSessionFiles>>,
  costUsd: number | null,
  now: Date,
) {
  const briefId = String(report.briefId ?? '');
  const defaultAssignee = process.env.RESEARCH_DEFAULT_ASSIGNEE_ID || null;
  let tasks = 0;

  for (const f of data.findings) {
    const owner = await memberIdByEmail(config, f.suggestedOwnerEmail);
    const created = await createRecord(config, 'researchFindings', {
      title: f.title,
      body: markdown(f.body),
      category: f.category,
      importance: f.importance,
      sourceUrls: f.sourceUrls.join('\n'),
      ...(f.publicationDate ? { publicationDate: f.publicationDate } : {}),
      reportId: report.id,
      ...(briefId ? { briefId } : {}),
      ...(owner ? { suggestedOwnerId: owner } : {}),
    });
    if (f.importance === 'HIGH') {
      const taskId = await createTask(config, f, created.id, owner ?? defaultAssignee);
      await updateRecord(config, 'researchFindings', created.id, { isTaskCreated: true, taskId });
      tasks += 1;
    }
  }

  // Competitors, upserted by name; price observations hang off them.
  const competitorIds = new Map<string, string>();
  const streamByCategory = new Map<string, string>();
  const observedNames = new Set(data.priceObservations.map((o) => o.competitor.toLowerCase()));
  for (const c of data.competitors) {
    const [existing] = await findRecords(config, 'competitors', { filter: eq('name', c.name), limit: 1 });
    let streamId: string | undefined;
    if (c.productCategory) {
      if (!streamByCategory.size) {
        for (const s of await findAllRecords(config, 'productStreams')) streamByCategory.set(String(s.slug ?? ''), s.id);
      }
      const slug = PRODUCT_STREAMS.find((s) => s.category === c.productCategory)?.slug;
      streamId = slug ? streamByCategory.get(slug) : undefined;
    }
    const patch = {
      ...(c.website ? { website: link(c.website) } : {}),
      ...(c.description ? { description: markdown(c.description) } : {}),
      ...(streamId ? { competitorOfId: streamId } : {}),
      ...(observedNames.has(c.name.toLowerCase()) ? { lastObservationAt: now.toISOString() } : {}),
    };
    if (existing) {
      if (Object.keys(patch).length) await updateRecord(config, 'competitors', existing.id, patch);
      competitorIds.set(c.name.toLowerCase(), existing.id);
    } else {
      competitorIds.set(c.name.toLowerCase(), (await createRecord(config, 'competitors', { name: c.name, ...patch })).id);
    }
  }

  const offeringIds = new Map<string, string | null>();
  for (const o of data.priceObservations) {
    const competitorId = competitorIds.get(o.competitor.toLowerCase());
    if (!competitorId) {
      console.warn('[research-ingest] price observation for unknown competitor', o.competitor);
      continue;
    }
    let offeringId: string | null = null;
    if (o.offeringCode) {
      if (!offeringIds.has(o.offeringCode)) {
        const [item] = await findRecords(config, 'offerings', { filter: eq('offeringCode', o.offeringCode), limit: 1 });
        offeringIds.set(o.offeringCode, item?.id ?? null);
      }
      offeringId = offeringIds.get(o.offeringCode) ?? null;
    }
    await createRecord(config, 'competitorPriceObservations', {
      name: `${o.competitor} — ${o.observedAt}`,
      competitorId,
      ...(offeringId ? { offeringId } : {}),
      competitorPriceEur: o.price,
      currencyCode: o.currencyCode,
      observedAt: o.observedAt,
      ...(o.sourceUrl ? { sourceUrl: link(o.sourceUrl) } : {}),
      ...(o.notes ? { notes: markdown(o.notes) } : {}),
    });
  }

  // Keep the Competitor summary fields (observation count, risk) in step with the observations.
  for (const competitorId of new Set(competitorIds.values())) {
    const all = await findAllRecords(config, 'competitorPriceObservations', { filter: eq('competitorId', competitorId) });
    await updateRecord(config, 'competitors', competitorId, competitorSummary(all, now));
  }

  const reportFile = files.find((f) => fileName(f).split('/').pop() === 'report.md');
  await updateRecord(config, 'researchReports', report.id, {
    status: 'READY',
    findingsCount: data.findings.length,
    completedAt: now.toISOString(),
    errorMessage: '',
    ...(costUsd !== null ? { costUsd } : {}),
    ...(reportFile ? { reportUrl: link(`https://api.anthropic.com/v1/files/${reportFile.id}/content`) } : {}),
  });
  return tasks;
}

export async function runIngest(
  config: TwentyConfig,
  apiKey: string | undefined,
  { dryRun }: z.infer<typeof IngestPayload>,
  now = new Date(),
): Promise<IngestResult> {
  const result: IngestResult = { reportsIngested: 0, findingsCreated: 0, tasksCreated: 0, reportsFailed: 0, dryRun };
  if (!apiKey) return result;
  const running = await findAllRecords(config, 'researchReports', { filter: eq('status', 'RUNNING') });

  for (const report of running) {
    const sessionId = typeof report.sessionId === 'string' ? report.sessionId : '';
    try {
      if (!sessionId) {
        if (!dryRun) await fail(config, report, 'report has no sessionId', now);
        result.reportsFailed += 1;
        continue;
      }
      const session = await getSession(apiKey, sessionId);
      if (!isFinished(session)) {
        const started = typeof report.startedAt === 'string' ? Date.parse(report.startedAt) : NaN;
        if (Number.isFinite(started) && now.getTime() - started > STUCK_AFTER_HOURS * 3600_000) {
          if (!dryRun) await fail(config, report, `session still ${session.status ?? 'running'} after ${STUCK_AFTER_HOURS}h`, now);
          result.reportsFailed += 1;
        }
        continue;
      }
      if (dryRun) {
        result.reportsIngested += 1;
        continue;
      }

      await updateRecord(config, 'researchReports', report.id, { status: 'INGESTING' });
      const files = await listSessionFiles(apiKey, sessionId);
      const found = await readFindings(apiKey, files);
      if (!found.data) {
        await fail(config, report, found.error, now);
        result.reportsFailed += 1;
        continue;
      }
      const tasks = await ingestReport(config, report, found.data, files, sessionCostUsd(session), now);
      result.reportsIngested += 1;
      result.findingsCreated += found.data.findings.length;
      result.tasksCreated += tasks;
    } catch (error) {
      // Leave the report as it is (RUNNING, or INGESTING if it got that far) and carry on with the rest.
      console.error('[research-ingest]', report.id, error);
    }
  }
  return result;
}

export const handler = async (event?: HttpEvent): Promise<HttpResult | IngestResult> => {
  const trigger = readTrigger(event, process.env.OPS_TOKEN);
  if ('error' in trigger) return trigger.error;
  const parsed = IngestPayload.safeParse(trigger.body);
  if (!parsed.success) return json(400, { error: 'invalid_payload', issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });

  try {
    const result = await runIngest(configFromEnv(), process.env.ANTHROPIC_API_KEY, parsed.data);
    return event?.requestContext?.http || event?.headers ? json(200, result) : result;
  } catch (error) {
    if (error instanceof TwentyApiError) {
      console.error('[research-ingest]', { message: error.message, body: error.body });
      return json(502, { error: 'crm_unavailable' });
    }
    throw error;
  }
};
