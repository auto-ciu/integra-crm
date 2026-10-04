/**
 * run-linkedin-discovery — REST sidecar (F0.3b) Lambda, A2. POST
 * `{ name?, query: { searches?, companies? }, maxResults, spendLimitUsd }`
 * with bearer OPS_TOKEN; ops/discover-leads.mjs calls it.
 *
 * `query.searches` are company names for the actor to look up on LinkedIn;
 * `query.companies` are LinkedIn company-page URLs. One input yields at most
 * one company, so there may be no more inputs than `maxResults`.
 *
 *   1. Off switch: APIFY_ENABLED must be "true" (503 otherwise).
 *   2. Company pages only: a `companies` URL that is not a LinkedIn
 *      /company/ or /showcase/ page (e.g. a person's /in/ profile) → 400.
 *   3. Spend cap: worst case (maxResults × the per-company price + the start
 *      fee) above `spendLimitUsd` → 422, nothing started. Apify is also given
 *      `maxTotalChargeUsd = spendLimitUsd`, so it stops charging there too.
 *   4. Record a LeadDiscoveryRun (QUEUED), start the pinned actor build, then
 *      mark the record RUNNING with the Apify run id. A start that fails is
 *      recorded as FAILED.
 *
 * Responds 201 `{ runId, discoveryRunId, estimatedCostUsd }`. apify-webhook
 * imports the results when the run ends: Apify calls it when
 * APIFY_WEBHOOK_URL is set, and `discover-leads --wait` polls it otherwise.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can write
 * leadDiscoveryRuns), APIFY_API_KEY, APIFY_ENABLED, OPS_TOKEN,
 * APIFY_WEBHOOK_URL + APIFY_WEBHOOK_TOKEN (optional: the webhook route and
 * its bearer secret).
 */
import { z } from 'zod';

import { TwentyApiError, configFromEnv, createRecord, updateRecord, type TwentyConfig } from '../../ops/lib/twenty-api';
import {
  APIFY_ACTOR,
  APIFY_ACTOR_BUILD,
  MAX_RESULTS_PER_RUN,
  RUN_SPEND_CEILING_USD,
  companyPageUrl,
  estimateCostUsd,
  isApifyEnabled,
} from '../../shared/lead-discovery.mjs';
import { ApifyError, abortRun, apifyFromEnv, startDiscoveryRun, type ApifyConfig } from './lib/discovery';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

// ------------------------------------------------------------------ payload

export const DiscoveryPayload = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  query: z
    .object({
      searches: z.array(z.string().trim().min(2).max(200)).max(MAX_RESULTS_PER_RUN).default([]),
      companies: z.array(z.string().trim().min(1).max(500)).max(MAX_RESULTS_PER_RUN).default([]),
    })
    .refine((q) => q.searches.length + q.companies.length > 0, {
      message: 'give at least one company name (searches) or LinkedIn company URL (companies)',
    }),
  maxResults: z.number().int().positive().max(MAX_RESULTS_PER_RUN),
  spendLimitUsd: z.number().positive().max(RUN_SPEND_CEILING_USD),
});
export type DiscoveryPayload = z.infer<typeof DiscoveryPayload>;

export type DiscoveryStarted = { runId: string; discoveryRunId: string; estimatedCostUsd: number };

/** An expected refusal with its HTTP status. */
export class DiscoveryError extends Error {
  constructor(
    readonly code:
      | 'apify_disabled'
      | 'apify_not_configured'
      | 'not_company_page'
      | 'too_many_inputs'
      | 'spend_limit_exceeded'
      | 'apify_unavailable',
    readonly status: number,
    readonly detail: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'DiscoveryError';
  }
}

// ------------------------------------------------------------------- start

/** De-duplicated actor input; throws on a non-company LinkedIn URL. */
export function actorInput(query: DiscoveryPayload['query']): { searches: string[]; companies: string[] } {
  const rejected = query.companies.filter((url) => !companyPageUrl(url));
  if (rejected.length) throw new DiscoveryError('not_company_page', 400, { rejected });
  const seen = new Set<string>();
  const searches = query.searches.filter((s) => {
    const key = s.toLowerCase().replace(/\s+/g, ' ');
    return seen.has(key) ? false : (seen.add(key), true);
  });
  const companies = [...new Set(query.companies.map((url) => companyPageUrl(url) as string))];
  return { searches, companies };
}

export async function runLinkedinDiscovery(
  config: TwentyConfig,
  apifyConfig: ApifyConfig | null,
  p: DiscoveryPayload,
  env: Record<string, string | undefined> = process.env,
  now = new Date(),
): Promise<DiscoveryStarted> {
  if (!isApifyEnabled(env)) throw new DiscoveryError('apify_disabled', 503);
  const input = actorInput(p.query);
  const inputs = input.searches.length + input.companies.length;
  if (inputs > p.maxResults) throw new DiscoveryError('too_many_inputs', 400, { inputs, maxResults: p.maxResults });
  const estimatedCostUsd = estimateCostUsd(p.maxResults);
  if (estimatedCostUsd > p.spendLimitUsd) {
    throw new DiscoveryError('spend_limit_exceeded', 422, { estimatedCostUsd, spendLimitUsd: p.spendLimitUsd, maxResults: p.maxResults });
  }
  if (!apifyConfig) throw new DiscoveryError('apify_not_configured', 503);

  const query = { actor: APIFY_ACTOR, build: APIFY_ACTOR_BUILD, ...input, maxResults: p.maxResults, spendLimitUsd: p.spendLimitUsd };
  const record = await createRecord(config, 'leadDiscoveryRuns', {
    name: p.name ?? `LinkedIn discovery ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    status: 'QUEUED',
    source: 'APIFY_LINKEDIN',
    query: { markdown: `\`\`\`json\n${JSON.stringify(query, null, 2)}\n\`\`\``, blocknote: null },
    costUsd: estimatedCostUsd,
  });

  const webhook = env.APIFY_WEBHOOK_URL && env.APIFY_WEBHOOK_TOKEN ? { url: env.APIFY_WEBHOOK_URL, token: env.APIFY_WEBHOOK_TOKEN } : undefined;
  let run;
  try {
    run = await startDiscoveryRun(apifyConfig, input, { maxResults: p.maxResults, spendLimitUsd: p.spendLimitUsd, webhook });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateRecord(config, 'leadDiscoveryRuns', record.id, { status: 'FAILED', errorMessage: message.slice(0, 500), completedAt: now.toISOString() });
    console.error('[run-linkedin-discovery] start failed', record.id, error instanceof ApifyError ? { message, body: error.body } : error);
    throw new DiscoveryError('apify_unavailable', 502, { discoveryRunId: record.id });
  }

  try {
    await updateRecord(config, 'leadDiscoveryRuns', record.id, {
      status: 'RUNNING',
      runId: run.id,
      startedAt: run.startedAt ?? now.toISOString(),
    });
  } catch (error) {
    // Without the run id the results could never be matched back: stop paying for them.
    await abortRun(apifyConfig, run.id).catch((abortError) => console.error('[run-linkedin-discovery] abort failed', run.id, abortError));
    throw error;
  }
  return { runId: run.id, discoveryRunId: record.id, estimatedCostUsd };
}

// ------------------------------------------------------------------ handler

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  const parsed = DiscoveryPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    return json(201, await runLinkedinDiscovery(configFromEnv(), apifyFromEnv(), parsed.data));
  } catch (error) {
    if (error instanceof DiscoveryError) return json(error.status, { error: error.code, ...error.detail });
    console.error('[run-linkedin-discovery]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: error instanceof ApifyError ? 'apify_unavailable' : 'crm_unavailable' });
  }
};
