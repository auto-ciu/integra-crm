/**
 * generate-stream-digest — REST sidecar (F0.3b) Lambda, B2. POST
 * `{ streamId, streamName, productCategories[], maxCostUsd?, dryRun? }` with
 * bearer OPS_TOKEN; ops/generate-all-digests.mjs calls it once per active
 * ProductStream.
 *
 *   1. Ask Claude for a 30-day EU regulatory digest for the stream (key
 *      changes, upcoming deadlines, actions for Chinese manufacturers) as
 *      structured JSON.
 *   2. Record it as a StreamUpdate (REGULATORY_UPDATE, publishedAt now).
 *   3. Add a StreamDocument (REGULATION) for each EU act the digest cites by
 *      number that the stream does not already have.
 *
 * Cost cap (shared/digest.mjs): the prompt is counted first (free) and not
 * sent if its worst case, prompt plus a full max_tokens of output, exceeds
 * `maxCostUsd` (the session's remaining budget; default and ceiling $10).
 * `dryRun` stops after the count and writes nothing.
 *
 * Limitation: no web search. The model answers from what it knows, so recent
 * weeks may be thin; the prompt tells it to say so rather than invent. Live,
 * cited research is Feature D (Managed Agents with web_search).
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can write
 * streamUpdates / streamDocuments), ANTHROPIC_API_KEY (the F0.7
 * "integra-crm" workspace key), OPS_TOKEN.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

import {
  TwentyApiError,
  configFromEnv,
  createRecord,
  eq,
  findRecords,
  type TwentyConfig,
} from '../../ops/lib/twenty-api';
import {
  DIGEST_MAX_OUTPUT_TOKENS,
  DIGEST_MODEL,
  SESSION_BUDGET_USD,
  costUsd,
  maxInputTokens,
  regulationNumber,
  worstCaseCostUsd,
} from '../../shared/digest.mjs';
import { KEY_DATES } from '../../shared/urgency.mjs';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

// ------------------------------------------------------------------ payload

export const DigestPayload = z.object({
  streamId: z.uuid(),
  streamName: z.string().trim().min(1).max(200),
  productCategories: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  /** What is left of the session budget; the call refuses to risk more. */
  maxCostUsd: z.number().positive().max(SESSION_BUDGET_USD).default(SESSION_BUDGET_USD),
  dryRun: z.boolean().default(false),
});
export type DigestPayload = z.infer<typeof DigestPayload>;

/** What Claude returns. */
export const Digest = z.object({
  headline: z.string().describe('At most 12 words, no trailing full stop'),
  summary: z.string().describe('Two to four sentences; say so plainly if little or nothing could be confirmed for the period'),
  regulationChanges: z.array(
    z.object({
      title: z.string(),
      regulation: z.string().describe('Official act number, e.g. "Regulation (EU) 2023/1542"; empty if none'),
      date: z.string().describe('YYYY-MM-DD, or empty if unknown'),
      summary: z.string(),
    }),
  ),
  upcomingDeadlines: z.array(
    z.object({
      date: z.string().describe('YYYY-MM-DD'),
      description: z.string(),
      regulation: z.string().describe('Official act number, or empty'),
    }),
  ),
  recommendedActions: z.array(z.string()).describe('Concrete actions for Chinese manufacturers selling into the EU'),
  regulationReferences: z
    .array(z.object({ number: z.string().describe('e.g. "(EU) 2023/1542"'), title: z.string().describe('Short name, e.g. "Battery Regulation"') }))
    .describe('Every EU act cited above, once each'),
});
export type Digest = z.infer<typeof Digest>;

export type DigestResult = {
  streamId: string;
  updateId: string | null;
  documentIds: string[];
  dryRun: boolean;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  model: string;
};

/**
 * An expected failure with its HTTP status. Failures after the Claude call
 * carry its usage, so the caller can still count what was spent.
 */
export class DigestError extends Error {
  constructor(
    readonly code: 'budget_exceeded' | 'refused' | 'no_output' | 'stream_not_found' | 'crm_unavailable',
    readonly status: number,
    readonly detail: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'DigestError';
  }
}

// ------------------------------------------------------------------- prompt

const SYSTEM = `You are a regulatory analyst at Integra Scientific, which helps Chinese manufacturers (mostly batteries) meet EU product law: Digital Product Passports (DPP), acting as EU Authorised Representative, training, and work with market-surveillance authorities.
You have no web access. Report only developments you are confident of, each with its date. If you cannot confirm developments inside the requested period, say so in the summary and focus on deadlines and actions that are certain. Never invent regulation numbers, dates or URLs. Cite EU acts by their official number.`;

const keyDates = Object.values(KEY_DATES)
  .map((d) => `- ${d.iso}: ${d.label}`)
  .join('\n');

export function digestPrompt(p: Pick<DigestPayload, 'streamName' | 'productCategories'>, now: Date): string {
  const today = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  return `Summarize the last 30 days of EU regulatory developments relevant to ${p.streamName} (${p.productCategories.join(', ')}). Include: key regulation changes, upcoming deadlines, and recommended actions for Chinese manufacturers. Format as structured JSON.

Period: ${from} to ${today} (today).
Dates Integra plans around:
${keyDates}`;
}

/** The StreamUpdate body. */
export function digestMarkdown(d: Digest): string {
  const cite = (r: string) => (r ? ` _(${r})_` : '');
  const sections = [d.summary];
  if (d.regulationChanges.length) {
    sections.push(
      `## Key regulation changes\n${d.regulationChanges.map((c) => `- **${c.title}**${c.date ? ` · ${c.date}` : ''}${cite(c.regulation)}: ${c.summary}`).join('\n')}`,
    );
  }
  if (d.upcomingDeadlines.length) {
    sections.push(`## Upcoming deadlines\n${d.upcomingDeadlines.map((x) => `- **${x.date}**: ${x.description}${cite(x.regulation)}`).join('\n')}`);
  }
  if (d.recommendedActions.length) {
    sections.push(`## Recommended actions\n${d.recommendedActions.map((a) => `- ${a}`).join('\n')}`);
  }
  sections.push(`_AI-generated by ${DIGEST_MODEL} without live sources; check each point against EUR-Lex before acting on it._`);
  return sections.join('\n\n');
}

// ------------------------------------------------------------------- digest

async function addRegulationDocuments(config: TwentyConfig, streamId: string, d: Digest): Promise<string[]> {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const ref of d.regulationReferences) {
    const number = regulationNumber(ref.number);
    if (!number || seen.has(number)) continue;
    seen.add(number);
    const [existing] = await findRecords(config, 'streamDocuments', {
      filter: `and(${eq('streamId', streamId)},name[ilike]:${JSON.stringify(`%${number}%`)})`,
      limit: 1,
    });
    if (existing) continue;
    const doc = await createRecord(config, 'streamDocuments', {
      name: `${ref.number.trim()} — ${ref.title.trim()}`.slice(0, 200),
      streamId,
      documentType: 'REGULATION',
    });
    ids.push(doc.id);
  }
  return ids;
}

export async function generateStreamDigest(
  config: TwentyConfig,
  client: Anthropic,
  p: DigestPayload,
  now = new Date(),
): Promise<DigestResult> {
  const [stream] = await findRecords(config, 'productStreams', { filter: eq('id', p.streamId), limit: 1 });
  if (!stream) throw new DigestError('stream_not_found', 404);

  const format = betaZodOutputFormat(Digest);
  const request = {
    model: DIGEST_MODEL,
    system: SYSTEM,
    messages: [{ role: 'user' as const, content: digestPrompt(p, now) }],
  };

  // The cap: never send a prompt whose worst case would overrun the budget.
  const { input_tokens: inputTokens } = await client.beta.messages.countTokens({ ...request, output_config: { format } });
  const allowed = maxInputTokens(p.maxCostUsd);
  if (inputTokens > allowed) {
    throw new DigestError('budget_exceeded', 422, { inputTokens, maxInputTokens: allowed, maxCostUsd: p.maxCostUsd });
  }
  if (p.dryRun) {
    return { streamId: p.streamId, updateId: null, documentIds: [], dryRun: true, inputTokens, outputTokens: 0, costUsd: worstCaseCostUsd(inputTokens), model: DIGEST_MODEL };
  }

  const response = await client.beta.messages.parse({
    ...request,
    max_tokens: DIGEST_MAX_OUTPUT_TOKENS,
    output_config: { effort: 'medium', format },
    // On a safety decline, the API re-runs the request on the model's default fallback.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });
  const spent = costUsd(response.model, response.usage);
  const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens, costUsd: spent, model: response.model };
  if (response.stop_reason === 'refusal') {
    console.warn('[generate-stream-digest] refused', p.streamId, response.stop_details);
    throw new DigestError('refused', 422, usage);
  }
  const digest = response.parsed_output;
  if (!digest) throw new DigestError('no_output', 502, { ...usage, stopReason: response.stop_reason });

  let updateId: string;
  try {
    const update = await createRecord(config, 'streamUpdates', {
      name: digest.headline.slice(0, 200),
      streamId: p.streamId,
      body: { markdown: digestMarkdown(digest), blocknote: null },
      updateType: 'REGULATORY_UPDATE',
      publishedAt: now.toISOString(),
    });
    updateId = update.id;
  } catch (error) {
    console.error('[generate-stream-digest] update not saved', p.streamId, error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    throw new DigestError('crm_unavailable', 502, usage);
  }
  // The update is the deliverable; a document that fails to save is logged, not fatal.
  let documentIds: string[] = [];
  try {
    documentIds = await addRegulationDocuments(config, p.streamId, digest);
  } catch (error) {
    console.error('[generate-stream-digest] documents not saved', p.streamId, error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
  }

  return { streamId: p.streamId, updateId, documentIds, dryRun: false, ...usage };
}

// ------------------------------------------------------------------ handler

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  const parsed = DigestPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const result = await generateStreamDigest(configFromEnv(), new Anthropic(), parsed.data);
    return json(result.dryRun ? 200 : 201, result);
  } catch (error) {
    if (error instanceof DigestError) return json(error.status, { error: error.code, ...error.detail });
    if (error instanceof TwentyApiError) {
      console.error('[generate-stream-digest]', { message: error.message, body: error.body });
      return json(502, { error: 'crm_unavailable' });
    }
    console.error('[generate-stream-digest]', error);
    return json(502, { error: 'claude_unavailable' });
  }
};
