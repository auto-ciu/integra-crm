/**
 * Minimal Twenty API client for the ops scripts — plain fetch, no packages.
 *
 * Env:
 *   TWENTY_API_URL   base URL of the Twenty server (default http://localhost:3000)
 *   TWENTY_API_KEY   an API key created in Settings → API & Webhooks (required)
 *
 * REST record endpoints: GET/PATCH /rest/<namePlural>[/<id>]
 * Metadata GraphQL:      POST /metadata
 */

export class TwentyApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'TwentyApiError';
    this.status = status;
    this.body = body;
  }
}

export function configFromEnv(env = process.env) {
  const baseUrl = (env.TWENTY_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  const apiKey = env.TWENTY_API_KEY;
  if (!apiKey) {
    throw new TwentyApiError('TWENTY_API_KEY is not set (create one in Settings → API & Webhooks)');
  }
  return { baseUrl, apiKey };
}

async function request(config, method, path, body) {
  let response;
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
    throw new TwentyApiError(`${method} ${path}: ${error.message}`);
  }
  const text = await response.text();
  let json;
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
  return json;
}

/** GET every record of an object, following Twenty's cursor pagination. */
export async function findAllRecords(config, namePlural, { filter, orderBy, pageSize = 200 } = {}) {
  const records = [];
  let startingAfter;
  for (;;) {
    const params = new URLSearchParams({ limit: String(pageSize) });
    if (filter) params.set('filter', filter);
    if (orderBy) params.set('order_by', orderBy);
    if (startingAfter) params.set('starting_after', startingAfter);
    const page = await request(config, 'GET', `/rest/${namePlural}?${params}`);
    const batch = page?.data?.[namePlural] ?? [];
    records.push(...batch);
    const hasNext = page?.pageInfo?.hasNextPage === true && page?.pageInfo?.endCursor;
    if (!hasNext || batch.length === 0) break;
    startingAfter = page.pageInfo.endCursor;
  }
  return records;
}

export async function updateRecord(config, namePlural, id, patch) {
  return request(config, 'PATCH', `/rest/${namePlural}/${id}`, patch);
}

/** Metadata GraphQL (objects / fields). Throws on transport OR GraphQL errors. */
export async function metadataGraphql(config, query, variables = {}) {
  const result = await request(config, 'POST', '/metadata', { query, variables });
  if (Array.isArray(result?.errors) && result.errors.length > 0) {
    throw new TwentyApiError(`metadata: ${result.errors.map((e) => e.message).join('; ')}`, {
      body: result.errors,
    });
  }
  return result?.data;
}

/** Tiny CLI flag parser: `--dry-run`, `--today=2026-09-18`. */
export function parseArgs(argv) {
  const flags = {};
  for (const arg of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (m) flags[m[1]] = m[2] ?? true;
  }
  return flags;
}
