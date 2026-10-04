/**
 * Client for the REST sidecar (F0.3b) Lambdas the ops scripts drive
 * (renewals-check, generate-stream-digest). Plain fetch, no packages.
 *
 * Env:
 *   SIDECAR_URL   API Gateway base URL; each function is routed at
 *                 <SIDECAR_URL>/<function-name> (e.g. /renewals-check)
 *   OPS_TOKEN     bearer secret the ops-invoked functions check
 *
 * The functions themselves read TWENTY_API_URL / TWENTY_API_KEY (and
 * ANTHROPIC_API_KEY where they call Claude) from their own environment.
 */

export class SidecarError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'SidecarError';
    this.status = status;
    this.body = body;
  }
}

export function sidecarFromEnv(env = process.env) {
  const baseUrl = (env.SIDECAR_URL ?? '').replace(/\/+$/, '');
  const token = env.OPS_TOKEN;
  if (!baseUrl) throw new SidecarError('SIDECAR_URL is not set (the API Gateway base URL of the CRM sidecar)');
  if (!token) throw new SidecarError('OPS_TOKEN is not set (the bearer secret of the ops-invoked sidecar functions)');
  return { baseUrl, token };
}

/** POST a JSON body to <SIDECAR_URL>/<route>; returns the parsed JSON, throws SidecarError on non-2xx. */
export async function callSidecar(config, route, body) {
  const url = `${config.baseUrl}/${route}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  } catch (error) {
    throw new SidecarError(`POST ${url}: ${error.message}`);
  }
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!response.ok) {
    throw new SidecarError(`POST /${route} → HTTP ${response.status}`, { status: response.status, body: json });
  }
  return json;
}
