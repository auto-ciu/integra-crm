/**
 * run-research — REST sidecar (F0.3b) Lambda, D1-D2. POST `{ briefId }` or
 * `{ topic, scope?, depth? }` (a brief is created on the fly) with bearer
 * OPS_TOKEN, plus an optional `maxCostUsd` (what is left of the session
 * budget; default and ceiling $10).
 *
 * BLOCKED: needs the Anthropic API key (`/integra/anthropic-api-key` in AWS
 * Parameter Store, not yet set up). Until ANTHROPIC_API_KEY is configured the
 * function validates the request, finds the brief, checks the topic has a
 * prompt, and answers 200 `{ status: "BLOCKED", reason: "ANTHROPIC_API_KEY not
 * configured" }` without writing anything. The path below that guard is the
 * intended behaviour and has not run against the live API yet.
 *
 * Once unblocked:
 *   1. Build the prompt (shared/research-prompts.mjs) from the brief's topic,
 *      scope and depth, and keep it on the brief (`prompt`).
 *   2. Cost cap, the same as the B2 digests (shared/digest.mjs): the prompt is
 *      counted first (free) and not sent if its worst case, prompt plus a full
 *      max_tokens of output, exceeds `maxCostUsd`.
 *   3. Mark the brief IN_PROGRESS (submittedAt), call the Messages API, then
 *      record the answer as `result`, the cost, and COMPLETED (FAILED if the
 *      model refused or ran out of tokens; any partial text is kept).
 *
 * Not yet (Feature D, live research with web search): `resultJson` (structured
 * extraction) and `sourceUrls` stay empty. The model has no web access here,
 * and the prompt says so; `isVerified` is left for staff.
 *
 * Responds 201 `{ briefId, status, costUsd, inputTokens, outputTokens, model }`.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can read and
 * write researchBriefs), ANTHROPIC_API_KEY, OPS_TOKEN.
 */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import { TwentyApiError, configFromEnv, createRecord, eq, findRecords, updateRecord, type TwentyConfig } from '../../ops/lib/twenty-api';
import {
  DIGEST_MAX_OUTPUT_TOKENS,
  DIGEST_MODEL,
  SESSION_BUDGET_USD,
  costUsd,
  maxInputTokens,
  worstCaseCostUsd,
} from '../../shared/digest.mjs';
import { DEFAULT_RESEARCH_DEPTH, DEFAULT_RESEARCH_SCOPE, RESEARCH_DEPTHS, RESEARCH_TOPICS, briefTitle, researchPrompt } from '../../shared/research-prompts.mjs';
import { PRODUCT_STREAMS } from '../../shared/streams.mjs';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

// ------------------------------------------------------------------ payload

const maxCostUsd = z.number().positive().max(SESSION_BUDGET_USD).default(SESSION_BUDGET_USD);

export const ResearchPayload = z.union([
  z.object({ briefId: z.uuid(), maxCostUsd }),
  z.object({
    topic: z.enum(RESEARCH_TOPICS as [string, ...string[]]),
    scope: z.string().trim().min(1).max(100).default(DEFAULT_RESEARCH_SCOPE),
    depth: z.enum(RESEARCH_DEPTHS.map((d) => d.value) as [string, ...string[]]).default(DEFAULT_RESEARCH_DEPTH),
    maxCostUsd,
  }),
]);
export type ResearchPayload = z.infer<typeof ResearchPayload>;

export type ResearchResult =
  | { status: 'BLOCKED'; reason: string }
  | { briefId: string; status: 'COMPLETED' | 'FAILED'; costUsd: number; inputTokens: number; outputTokens: number; model: string };

/**
 * An expected failure with its HTTP status. Failures after the Claude call
 * carry its usage, so the caller can still count what was spent.
 */
export class ResearchError extends Error {
  constructor(
    readonly code: 'brief_not_found' | 'no_prompt_for_topic' | 'budget_exceeded',
    readonly status: number,
    readonly detail: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'ResearchError';
  }
}

export const BLOCKED: ResearchResult = { status: 'BLOCKED', reason: 'ANTHROPIC_API_KEY not configured' };

// -------------------------------------------------------------------- brief

type Brief = { id?: string; topic: string; scope: string; depth: string };

const topicName = (topic: string) => PRODUCT_STREAMS.find((s) => s.category === topic)?.name ?? topic;

async function loadBrief(config: TwentyConfig, p: ResearchPayload): Promise<Brief> {
  if (!('briefId' in p)) return { topic: p.topic, scope: p.scope, depth: p.depth };
  const [record] = await findRecords(config, 'researchBriefs', { filter: eq('id', p.briefId), limit: 1 });
  if (!record) throw new ResearchError('brief_not_found', 404);
  return {
    id: record.id,
    topic: String(record.topic ?? ''),
    scope: String(record.scope || DEFAULT_RESEARCH_SCOPE),
    depth: String(record.depth || DEFAULT_RESEARCH_DEPTH),
  };
}

const markdown = (text: string) => ({ markdown: text, blocknote: null });

// ---------------------------------------------------------------- research

export async function runResearch(
  config: TwentyConfig,
  client: Anthropic | null,
  p: ResearchPayload,
  now = new Date(),
): Promise<ResearchResult> {
  const brief = await loadBrief(config, p);
  const prompt = researchPrompt(brief);
  if (!prompt) throw new ResearchError('no_prompt_for_topic', 422, { topic: brief.topic });

  // BLOCKED: no Anthropic API key yet. Nothing below runs until one is configured.
  if (!client) return BLOCKED;

  // The cap: never send a prompt whose worst case would overrun the budget.
  const request = { model: DIGEST_MODEL, messages: [{ role: 'user' as const, content: prompt }] };
  const { input_tokens: inputTokens } = await client.messages.countTokens(request);
  const allowed = maxInputTokens(p.maxCostUsd);
  if (inputTokens > allowed) {
    throw new ResearchError('budget_exceeded', 422, { inputTokens, maxInputTokens: allowed, worstCaseUsd: worstCaseCostUsd(inputTokens), maxCostUsd: p.maxCostUsd });
  }

  const submittedAt = now.toISOString();
  const fields = {
    title: briefTitle(topicName(brief.topic), brief.scope, brief.depth),
    topic: brief.topic,
    scope: brief.scope,
    depth: brief.depth,
    prompt: markdown(prompt),
    status: 'IN_PROGRESS',
    submittedAt,
  };
  const briefId = brief.id ?? (await createRecord(config, 'researchBriefs', fields)).id;
  if (brief.id) await updateRecord(config, 'researchBriefs', briefId, fields);

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({ ...request, max_tokens: DIGEST_MAX_OUTPUT_TOKENS });
  } catch (error) {
    await updateRecord(config, 'researchBriefs', briefId, { status: 'FAILED', completedAt: new Date().toISOString() }).catch((e) =>
      console.error('[run-research] could not mark the brief FAILED', briefId, e),
    );
    throw error;
  }

  const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens, costUsd: costUsd(response.model, response.usage), model: response.model };
  const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n\n');
  const status = response.stop_reason === 'end_turn' && text ? 'COMPLETED' : 'FAILED';
  if (status === 'FAILED') console.warn('[run-research] not completed', briefId, response.stop_reason);

  await updateRecord(config, 'researchBriefs', briefId, {
    status,
    ...(text ? { result: markdown(text) } : {}),
    costUsd: usage.costUsd,
    completedAt: new Date().toISOString(),
  });
  return { briefId, status, ...usage };
}

// ------------------------------------------------------------------ handler

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  const parsed = ResearchPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const result = await runResearch(configFromEnv(), apiKey ? new Anthropic({ apiKey }) : null, parsed.data);
    return json('briefId' in result ? 201 : 200, result);
  } catch (error) {
    if (error instanceof ResearchError) return json(error.status, { error: error.code, ...error.detail });
    if (error instanceof TwentyApiError) {
      console.error('[run-research]', { message: error.message, body: error.body });
      return json(502, { error: 'crm_unavailable' });
    }
    console.error('[run-research]', error);
    return json(502, { error: 'claude_unavailable' });
  }
};
