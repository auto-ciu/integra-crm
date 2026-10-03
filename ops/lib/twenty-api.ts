/**
 * TypeScript port of ops/lib/twenty-api.mjs — the REST client the CRM sidecar
 * (F0.3b) uses. Same contract: plain fetch, no packages, REST records +
 * metadata GraphQL only (principle U5: never the logic-function runtime, never
 * the database). Keep the two files in step until the .mjs ops scripts move
 * to TypeScript.
 *
 * Env:
 *   TWENTY_API_URL   base URL of the Twenty server (default http://localhost:3000)
 *   TWENTY_API_KEY   an API key created in Settings → API & Webhooks (required)
 *
 * REST record endpoints: GET/POST/PATCH /rest/<namePlural>[/<id>]
 * Metadata GraphQL:      POST /metadata
 */

export type TwentyConfig = {
  baseUrl: string;
  apiKey: string;
};

export type TwentyRecord = { id: string } & Record<string, unknown>;

export class TwentyApiError extends Error {
  readonly status?: number;
  readonly body?: unknown;

  constructor(message: string, { status, body }: { status?: number; body?: unknown } = {}) {
    super(message);
    this.name = 'TwentyApiError';
    this.status = status;
    this.body = body;
  }
}

export function configFromEnv(env: Record<string, string | undefined> = process.env): TwentyConfig {
  const baseUrl = (env.TWENTY_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  const apiKey = env.TWENTY_API_KEY;
  if (!apiKey) {
    throw new TwentyApiError('TWENTY_API_KEY is not set (create one in Settings → API & Webhooks)');
  }
  return { baseUrl, apiKey };
}

async function request<T = unknown>(
  config: TwentyConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new TwentyApiError(`${method} ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!response.ok) {
    throw new TwentyApiError(`${method} ${path} → HTTP ${response.status}`, {
      status: response.status,
      body: json,
    });
  }
  return json as T;
}

type ListPage = {
  data?: Record<string, TwentyRecord[] | undefined>;
  pageInfo?: { hasNextPage?: boolean; endCursor?: string };
};

export type FindOptions = {
  /** Twenty REST filter, e.g. `emails.primaryEmail[eq]:"a@b.com"`. */
  filter?: string;
  /** e.g. `createdAt[DescNullsLast]`. */
  orderBy?: string;
};

/** One page of records (no pagination) — for lookups that expect 0–few hits. */
export async function findRecords(
  config: TwentyConfig,
  namePlural: string,
  { filter, orderBy, limit = 20 }: FindOptions & { limit?: number } = {},
): Promise<TwentyRecord[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (filter) params.set('filter', filter);
  if (orderBy) params.set('order_by', orderBy);
  const page = await request<ListPage>(config, 'GET', `/rest/${namePlural}?${params}`);
  return page?.data?.[namePlural] ?? [];
}

/** GET every record of an object, following Twenty's cursor pagination. */
export async function findAllRecords(
  config: TwentyConfig,
  namePlural: string,
  { filter, orderBy, pageSize = 200 }: FindOptions & { pageSize?: number } = {},
): Promise<TwentyRecord[]> {
  const records: TwentyRecord[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const params = new URLSearchParams({ limit: String(pageSize) });
    if (filter) params.set('filter', filter);
    if (orderBy) params.set('order_by', orderBy);
    if (startingAfter) params.set('starting_after', startingAfter);
    const page = await request<ListPage>(config, 'GET', `/rest/${namePlural}?${params}`);
    const batch = page?.data?.[namePlural] ?? [];
    records.push(...batch);
    const endCursor = page?.pageInfo?.hasNextPage === true ? page.pageInfo.endCursor : undefined;
    if (!endCursor || batch.length === 0) break;
    startingAfter = endCursor;
  }
  return records;
}

/**
 * POST /rest/<namePlural>. Twenty answers `{ data: { create<NameSingular>: record } }`;
 * the single value under `data` is returned whatever its key.
 */
export async function createRecord(
  config: TwentyConfig,
  namePlural: string,
  data: Record<string, unknown>,
): Promise<TwentyRecord> {
  const result = await request<{ data?: Record<string, TwentyRecord> }>(config, 'POST', `/rest/${namePlural}`, data);
  const record = result?.data ? Object.values(result.data)[0] : undefined;
  if (!record?.id) {
    throw new TwentyApiError(`POST /rest/${namePlural}: response carried no record`, { body: result });
  }
  return record;
}

export async function updateRecord(
  config: TwentyConfig,
  namePlural: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<unknown> {
  return request(config, 'PATCH', `/rest/${namePlural}/${id}`, patch);
}

/** Metadata GraphQL (objects / fields). Throws on transport OR GraphQL errors. */
export async function metadataGraphql<T = unknown>(
  config: TwentyConfig,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T | undefined> {
  const result = await request<{ data?: T; errors?: Array<{ message: string }> }>(config, 'POST', '/metadata', {
    query,
    variables,
  });
  if (Array.isArray(result?.errors) && result.errors.length > 0) {
    throw new TwentyApiError(`metadata: ${result.errors.map((e) => e.message).join('; ')}`, {
      body: result.errors,
    });
  }
  return result?.data;
}

/**
 * A REST filter literal: `field[eq]:"value"`. The value is JSON-quoted so a
 * stray quote or backslash can't break out of the filter expression.
 */
export const eq = (field: string, value: string) => `${field}[eq]:${JSON.stringify(value)}`;

/** Tiny CLI flag parser: `--dry-run`, `--today=2026-09-18`. */
export function parseArgs(argv: string[]): Record<string, string | true> {
  const flags: Record<string, string | true> = {};
  for (const arg of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (m) flags[m[1]] = m[2] ?? true;
  }
  return flags;
}
