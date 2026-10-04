/**
 * Thin client for the Claude Managed Agents beta (D1-D2), over fetch so a
 * beta API change shows up as one edit here. Anthropic hosts the agent loop
 * and sandbox; the CRM only starts sessions and reads their output files.
 * The agent is never given CRM credentials.
 *
 * The beta header is pinned in shared/research-agent.mjs. Response shapes are
 * read defensively (every field optional) because the beta may change.
 */
import { ANTHROPIC_API_VERSION, MANAGED_AGENTS_BETA } from '../../../shared/research-agent.mjs';

const BASE_URL = 'https://api.anthropic.com';

export class ManagedAgentsError extends Error {
  constructor(message: string, readonly status: number, readonly body?: unknown) {
    super(message);
    this.name = 'ManagedAgentsError';
  }
}

export type SessionInfo = {
  id: string;
  status?: string;
  stop_reason?: { type?: string };
  usage?: { list_cost?: number | string | { amount?: string } };
};

export type SessionFile = { id: string; filename?: string; name?: string };

async function call<T>(apiKey: string, method: string, path: string, body?: unknown, raw = false): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
      'anthropic-beta': MANAGED_AGENTS_BETA,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => undefined);
    throw new ManagedAgentsError(`${method} ${path}: ${response.status}`, response.status, detail);
  }
  return (raw ? await response.text() : await response.json()) as T;
}

/**
 * Start a session with one user.define_outcome event. The sessions endpoint
 * takes the agent in the body (the agent is created once, outside this app).
 */
export async function createOutcomeSession(
  apiKey: string,
  p: { agentId: string; environmentId: string; title: string; description: string; rubric: string; budget: unknown },
): Promise<SessionInfo> {
  return call<SessionInfo>(apiKey, 'POST', '/v1/sessions', {
    agent: p.agentId,
    environment_id: p.environmentId,
    title: p.title,
    budget: p.budget,
    initial_events: [
      {
        type: 'user.define_outcome',
        description: p.description,
        rubric: { type: 'text', content: p.rubric },
      },
    ],
  });
}

export const getSession = (apiKey: string, sessionId: string) =>
  call<SessionInfo>(apiKey, 'GET', `/v1/sessions/${encodeURIComponent(sessionId)}`);

/** Files the agent wrote to /mnt/session/outputs/ (Files API, scope_id = session). */
export async function listSessionFiles(apiKey: string, sessionId: string): Promise<SessionFile[]> {
  const page = await call<{ data?: SessionFile[] }>(apiKey, 'GET', `/v1/files?scope_id=${encodeURIComponent(sessionId)}`);
  return page.data ?? [];
}

export const downloadFile = (apiKey: string, fileId: string) =>
  call<string>(apiKey, 'GET', `/v1/files/${encodeURIComponent(fileId)}/content`, undefined, true);

export const fileName = (f: SessionFile) => f.filename ?? f.name ?? '';

/** Idle (and not waiting on a tool answer) or terminated: nothing more will be written. */
export const isFinished = (s: SessionInfo) =>
  s.status === 'terminated' || (s.status === 'idle' && s.stop_reason?.type !== 'requires_action');

/** Reported list cost in USD, if the session says. */
export function sessionCostUsd(s: SessionInfo): number | null {
  const raw = s.usage?.list_cost;
  const value = typeof raw === 'object' && raw !== null ? raw.amount : raw;
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}
