/**
 * apify-webhook — REST sidecar (F0.3b) Lambda, A2. Apify POSTs here when a
 * run started by run-linkedin-discovery ends (default webhook payload, with
 * the bearer APIFY_WEBHOOK_TOKEN that run-linkedin-discovery put in the
 * webhook's headers template). `ops/discover-leads.mjs --wait` POSTs
 * `{ eventData: { actorRunId } }` here to poll when no webhook can reach it.
 *
 * The payload only names the run. Status, cost and results are always read
 * back from Apify, so a forged or replayed call can do no more than trigger
 * an import that would have happened anyway.
 *
 *   1. Off switch: APIFY_ENABLED must be "true" (503; Apify retries).
 *   2. The LeadDiscoveryRun with this runId (404 for runs we did not start).
 *      Already finished → return its stored counts, import nothing.
 *   3. Run still going → 202 `{ status: 'RUNNING' }`, nothing written.
 *   4. Each dataset item → a DiscoveredCompany, scored on the way in:
 *      - not a LinkedIn company page (e.g. a person profile) → dropped;
 *      - no website → dropped;
 *      - the same page twice in this run, or already imported by an earlier
 *        call for this run → skipped;
 *      - the same page from an earlier run or on a CRM Company → imported
 *        with isDuplicate.
 *   5. The run: resultsCount, resultsNew, costUsd (what Apify charged),
 *      completedAt, COMPLETED (FAILED, with the partial results imported,
 *      when Apify did not report SUCCEEDED).
 *
 * Responds `{ discoveryRunId, status, companiesImported, newCompanies,
 * duplicates, skipped, costUsd }`.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can read
 * companies and write leadDiscoveryRuns / discoveredCompanies),
 * APIFY_API_KEY, APIFY_ENABLED, APIFY_WEBHOOK_TOKEN.
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
import {
  MAX_RESULTS_PER_RUN,
  breakdownMarkdown,
  isApifyEnabled,
  mapApifyItem,
  runCostUsd,
  scoreDiscoveredCompany,
} from '../../shared/lead-discovery.mjs';
import {
  ApifyError,
  TERMINAL_RUN_STATUSES,
  apifyFromEnv,
  findCompanyByLinkedin,
  getDatasetItems,
  getRun,
  type ApifyConfig,
} from './lib/discovery';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

// ------------------------------------------------------------------ payload

/** Apify's default webhook payload, of which only the run id is used. */
export const WebhookPayload = z
  .object({
    eventType: z.string().optional(),
    eventData: z.object({ actorRunId: z.string().min(1).max(64).optional() }).partial().optional(),
    resource: z.object({ id: z.string().min(1).max(64).optional() }).partial().optional(),
  })
  .transform((p) => ({ runId: p.eventData?.actorRunId ?? p.resource?.id ?? null }))
  .refine((p) => p.runId !== null, { message: 'eventData.actorRunId (or resource.id) is required' });

export type ImportResult = {
  discoveryRunId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  companiesImported: number;
  newCompanies: number;
  duplicates: number;
  skipped: { notCompanyPage: number; noWebsite: number; repeated: number; alreadyImported: number };
  costUsd: number | null;
  alreadyProcessed?: boolean;
};

export class WebhookError extends Error {
  constructor(
    readonly code: 'apify_disabled' | 'apify_not_configured' | 'unknown_run' | 'apify_run_not_found',
    readonly status: number,
  ) {
    super(code);
    this.name = 'WebhookError';
  }
}

const noneSkipped = () => ({ notCompanyPage: 0, noWebsite: 0, repeated: 0, alreadyImported: 0 });

// ------------------------------------------------------------------- import

const link = (url: string) => ({ primaryLinkUrl: url, primaryLinkLabel: '', secondaryLinks: null });

/** Where else this LinkedIn page is known: this run, another run, or a CRM Company. */
async function priorSightings(config: TwentyConfig, discoveryRunId: string, linkedinUrl: string) {
  const existing = await findRecords(config, 'discoveredCompanies', {
    filter: eq('linkedinUrl.primaryLinkUrl', linkedinUrl),
    limit: 20,
  });
  const inThisRun = existing.some((r) => r.discoveryRunId === discoveryRunId);
  if (inThisRun) return { inThisRun, elsewhere: true };
  const elsewhere = existing.length > 0 || (await findCompanyByLinkedin(config, linkedinUrl)) !== null;
  return { inThisRun, elsewhere };
}

function storedResult(run: TwentyRecord): ImportResult {
  const imported = Number(run.resultsCount ?? 0);
  const fresh = Number(run.resultsNew ?? 0);
  return {
    discoveryRunId: run.id,
    status: run.status === 'FAILED' ? 'FAILED' : 'COMPLETED',
    companiesImported: imported,
    newCompanies: fresh,
    duplicates: imported - fresh,
    skipped: noneSkipped(),
    costUsd: typeof run.costUsd === 'number' ? run.costUsd : null,
    alreadyProcessed: true,
  };
}

export async function importDiscoveryRun(
  config: TwentyConfig,
  apifyConfig: ApifyConfig | null,
  runId: string,
  env: Record<string, string | undefined> = process.env,
  now = new Date(),
): Promise<ImportResult> {
  if (!isApifyEnabled(env)) throw new WebhookError('apify_disabled', 503);
  if (!apifyConfig) throw new WebhookError('apify_not_configured', 503);

  const [record] = await findRecords(config, 'leadDiscoveryRuns', { filter: eq('runId', runId), limit: 1 });
  if (!record) throw new WebhookError('unknown_run', 404);
  if (record.completedAt && (record.status === 'COMPLETED' || record.status === 'FAILED')) return storedResult(record);

  const run = await getRun(apifyConfig, runId);
  if (!run) throw new WebhookError('apify_run_not_found', 404);
  if (!TERMINAL_RUN_STATUSES.has(run.status)) {
    return { discoveryRunId: record.id, status: 'RUNNING', companiesImported: 0, newCompanies: 0, duplicates: 0, skipped: noneSkipped(), costUsd: null };
  }

  const items = run.defaultDatasetId ? await getDatasetItems(apifyConfig, run.defaultDatasetId, MAX_RESULTS_PER_RUN) : [];
  const skipped = noneSkipped();
  const seen = new Set<string>();
  let imported = 0;
  let fresh = 0;

  for (const item of items) {
    const mapped = mapApifyItem(item, runId);
    if (!mapped.ok) {
      if (mapped.reason === 'not_company_page') skipped.notCompanyPage += 1;
      else skipped.noWebsite += 1;
      continue;
    }
    const c = mapped.record;
    if (seen.has(c.linkedinUrl)) {
      skipped.repeated += 1;
      continue;
    }
    seen.add(c.linkedinUrl);

    const prior = await priorSightings(config, record.id, c.linkedinUrl);
    if (prior.inThisRun) {
      skipped.alreadyImported += 1;
      continue;
    }
    const scored = scoreDiscoveredCompany(c);
    await createRecord(config, 'discoveredCompanies', {
      discoveryRunId: record.id,
      companyName: c.companyName,
      website: link(c.website),
      linkedinUrl: link(c.linkedinUrl),
      industry: c.industry,
      companySize: c.companySize,
      headquarters: c.headquarters,
      productCategories: c.productCategories,
      description: { markdown: c.description, blocknote: null },
      isDuplicate: prior.elsewhere,
      score: scored.score,
      scoreBreakdown: { markdown: breakdownMarkdown(scored), blocknote: null },
    });
    imported += 1;
    if (!prior.elsewhere) fresh += 1;
  }

  // Totals are recounted, so a retry after an interrupted import still adds up.
  const all = await findAllRecords(config, 'discoveredCompanies', { filter: eq('discoveryRunId', record.id) });
  const status = run.status === 'SUCCEEDED' ? 'COMPLETED' : 'FAILED';
  const costUsd = runCostUsd(run, items.length);
  await updateRecord(config, 'leadDiscoveryRuns', record.id, {
    status,
    resultsCount: all.length,
    resultsNew: all.filter((r) => !r.isDuplicate).length,
    costUsd,
    completedAt: (run.finishedAt ?? now.toISOString()) as string,
    ...(status === 'FAILED' ? { errorMessage: `Apify run ${run.status}${run.statusMessage ? `: ${run.statusMessage}` : ''}`.slice(0, 500) } : {}),
  });

  return {
    discoveryRunId: record.id,
    status,
    companiesImported: imported,
    newCompanies: fresh,
    duplicates: imported - fresh,
    skipped,
    costUsd,
  };
}

// ------------------------------------------------------------------ handler

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.APIFY_WEBHOOK_TOKEN);
  if ('error' in request) return request.error;
  const parsed = WebhookPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const result = await importDiscoveryRun(configFromEnv(), apifyFromEnv(), parsed.data.runId as string);
    return json(result.status === 'RUNNING' ? 202 : 200, result);
  } catch (error) {
    if (error instanceof WebhookError) return json(error.status, { error: error.code });
    console.error('[apify-webhook]', error instanceof TwentyApiError || error instanceof ApifyError ? { message: error.message, body: error.body } : error);
    return json(502, { error: error instanceof ApifyError ? 'apify_unavailable' : 'crm_unavailable' });
  }
};
