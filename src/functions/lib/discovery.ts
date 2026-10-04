/**
 * Pieces shared by the A2 lead-discovery sidecar functions: a minimal Apify
 * REST client (plain fetch, like ops/lib/twenty-api.ts) and the CRM Company
 * lookups used for duplicate flags and promotion. Not a Twenty app entity.
 *
 * Only ever talks to the one pinned actor in shared/lead-discovery.mjs, and
 * never sends cookies or a LinkedIn session (guardrails a, b).
 *
 * Env: APIFY_API_KEY (Apify API token; Settings → Integrations in Apify).
 */
import { findRecords, type TwentyConfig, type TwentyRecord } from '../../../ops/lib/twenty-api';
import { hostMatchesDomain } from '../../../shared/icp.mjs';
import { APIFY_ACTOR, APIFY_ACTOR_BUILD, APIFY_API, companyPageUrl } from '../../../shared/lead-discovery.mjs';

// -------------------------------------------------------------------- Apify

export class ApifyError extends Error {
  readonly status?: number;
  readonly body?: unknown;

  constructor(message: string, { status, body }: { status?: number; body?: unknown } = {}) {
    super(message);
    this.name = 'ApifyError';
    this.status = status;
    this.body = body;
  }
}

export type ApifyConfig = { token: string };

export function apifyFromEnv(env: Record<string, string | undefined> = process.env): ApifyConfig | null {
  return env.APIFY_API_KEY ? { token: env.APIFY_API_KEY } : null;
}

/** The parts of an Apify run object the functions read. */
export type ApifyRun = {
  id: string;
  status: string;
  defaultDatasetId?: string;
  startedAt?: string;
  finishedAt?: string | null;
  statusMessage?: string | null;
  usageTotalUsd?: number;
  chargedEventCounts?: Record<string, number>;
  pricingInfo?: unknown;
};

/** Apify run states that will not change again. */
export const TERMINAL_RUN_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT']);

async function apify<T>(config: ApifyConfig, method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${APIFY_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApifyError(`${method} ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!response.ok) throw new ApifyError(`${method} ${path} → HTTP ${response.status}`, { status: response.status, body: json });
  return json as T;
}

export type ActorInput = { searches: string[]; companies: string[] };

/**
 * Start an async run of the pinned actor build. `maxTotalChargeUsd` makes
 * Apify itself stop charging at the spend limit; the optional webhook calls
 * apify-webhook when the run ends, with a bearer header.
 */
export async function startDiscoveryRun(
  config: ApifyConfig,
  input: ActorInput,
  { maxResults, spendLimitUsd, webhook }: { maxResults: number; spendLimitUsd: number; webhook?: { url: string; token: string } },
): Promise<ApifyRun> {
  const params = new URLSearchParams({
    build: APIFY_ACTOR_BUILD,
    maxItems: String(maxResults),
    maxTotalChargeUsd: String(spendLimitUsd),
  });
  if (webhook) {
    const webhooks = [
      {
        eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED', 'ACTOR.RUN.ABORTED', 'ACTOR.RUN.TIMED_OUT'],
        requestUrl: webhook.url,
        headersTemplate: JSON.stringify({ Authorization: `Bearer ${webhook.token}` }),
      },
    ];
    params.set('webhooks', Buffer.from(JSON.stringify(webhooks)).toString('base64'));
  }
  const actor = APIFY_ACTOR.replace('/', '~');
  const result = await apify<{ data?: ApifyRun }>(config, 'POST', `/acts/${actor}/runs?${params}`, {
    ...(input.companies.length ? { companies: input.companies } : {}),
    ...(input.searches.length ? { searches: input.searches } : {}),
  });
  if (!result?.data?.id) throw new ApifyError('run start: response carried no run', { body: result });
  return result.data;
}

export async function getRun(config: ApifyConfig, runId: string): Promise<ApifyRun | null> {
  try {
    const result = await apify<{ data?: ApifyRun }>(config, 'GET', `/actor-runs/${encodeURIComponent(runId)}`);
    return result?.data ?? null;
  } catch (error) {
    if (error instanceof ApifyError && error.status === 404) return null;
    throw error;
  }
}

export async function abortRun(config: ApifyConfig, runId: string): Promise<void> {
  await apify(config, 'POST', `/actor-runs/${encodeURIComponent(runId)}/abort`);
}

/** Every item of a dataset, up to `max`. */
export async function getDatasetItems(config: ApifyConfig, datasetId: string, max: number): Promise<unknown[]> {
  const items: unknown[] = [];
  const pageSize = 250;
  while (items.length < max) {
    const params = new URLSearchParams({ clean: 'true', format: 'json', offset: String(items.length), limit: String(Math.min(pageSize, max - items.length)) });
    const page = await apify<unknown[]>(config, 'GET', `/datasets/${encodeURIComponent(datasetId)}/items?${params}`);
    if (!Array.isArray(page) || page.length === 0) break;
    items.push(...page);
    if (page.length < pageSize) break;
  }
  return items;
}

// ---------------------------------------------------------------------- CRM

type Links = { primaryLinkUrl?: string | null } | null | undefined;
const primaryUrl = (value: unknown) => (value as Links)?.primaryLinkUrl ?? '';

/** CRM Company whose LinkedIn link is the same company page, or null. */
export async function findCompanyByLinkedin(config: TwentyConfig, linkedinUrl: string): Promise<TwentyRecord | null> {
  const path = linkedinUrl.replace(/^https:\/\/www\./, '');
  const candidates = await findRecords(config, 'companies', {
    filter: `linkedinLink.primaryLinkUrl[ilike]:${JSON.stringify(`%${path}%`)}`,
    limit: 10,
  });
  return candidates.find((c) => companyPageUrl(primaryUrl(c.linkedinLink)) === linkedinUrl) ?? null;
}

/** CRM Company whose website is the same host (or a subdomain of it), or null. */
export async function findCompanyByWebsite(config: TwentyConfig, website: string): Promise<TwentyRecord | null> {
  let host: string;
  try {
    host = new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  const candidates = await findRecords(config, 'companies', {
    filter: `domainName.primaryLinkUrl[ilike]:${JSON.stringify(`%${host}%`)}`,
    limit: 10,
  });
  return candidates.find((c) => hostMatchesDomain(primaryUrl(c.domainName), host)) ?? null;
}
