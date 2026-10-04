/**
 * B2 AI stream digests: model, prices and the per-session spending cap.
 * Shared by src/functions/generate-stream-digest.ts (enforces the cap on each
 * call), ops/generate-all-digests.mjs (keeps the running session total) and
 * verify-model.mjs. Plain ESM, dependency-free.
 *
 * The cap: one digest session (a run of ops/generate-all-digests.mjs, or one
 * direct call) may spend at most SESSION_BUDGET_USD, the plan's $10/session.
 * Output is bounded by max_tokens; input is bounded by counting the prompt
 * (count_tokens, free) and refusing to send it when the worst case, input
 * plus a full max_tokens of output, would not fit in what is left.
 */

export const DIGEST_MODEL = 'claude-opus-5-5';
export const SESSION_BUDGET_USD = 10;
/** max_tokens per digest (thinking included). */
export const DIGEST_MAX_OUTPUT_TOKENS = 16_000;
/** Hard ceiling on the prompt, whatever the budget. A digest prompt is ~1k. */
export const DIGEST_MAX_INPUT_TOKENS = 20_000;

/** USD per million tokens (Anthropic list prices). */
export const PRICES = Object.freeze({
  'claude-opus-5-5': { input: 4, output: 20 },
});
/**
 * A server-side refusal fallback can answer with another model. Anything not
 * in PRICES is costed at the dearest current tier, so the cap errs high.
 */
export const UNKNOWN_MODEL_PRICE = Object.freeze({ input: 10, output: 50 });

export const priceFor = (model) => PRICES[model] ?? UNKNOWN_MODEL_PRICE;

const round6 = (usd) => Math.round(usd * 1e6) / 1e6;

/** Actual cost of one response from its `usage` (cache writes 1.25×, reads 0.1× input). */
export function costUsd(model, usage) {
  const p = priceFor(model);
  const input =
    (usage?.input_tokens ?? 0) +
    1.25 * (usage?.cache_creation_input_tokens ?? 0) +
    0.1 * (usage?.cache_read_input_tokens ?? 0);
  return round6((input * p.input + (usage?.output_tokens ?? 0) * p.output) / 1e6);
}

/** Worst case for one call: the whole prompt plus a full max_tokens, at fallback prices. */
export function worstCaseCostUsd(inputTokens) {
  const p = UNKNOWN_MODEL_PRICE;
  return round6((inputTokens * p.input + DIGEST_MAX_OUTPUT_TOKENS * p.output) / 1e6);
}

/** Largest prompt (tokens) one call may send with `budgetUsd` left; 0 when not even max_tokens fits. */
export function maxInputTokens(budgetUsd) {
  const p = UNKNOWN_MODEL_PRICE;
  const left = Math.min(budgetUsd, SESSION_BUDGET_USD) - (DIGEST_MAX_OUTPUT_TOKENS * p.output) / 1e6;
  if (!(left > 0)) return 0;
  return Math.min(DIGEST_MAX_INPUT_TOKENS, Math.floor((left * 1e6) / p.input));
}

/** `$1.23`. */
export const formatUsd = (usd) => `$${(Math.round(usd * 100) / 100).toFixed(2)}`;

/**
 * The bare number of an EU act ("2023/1542" from "Regulation (EU) 2023/1542",
 * "1907/2006" from "(EC) No 1907/2006", "2001/95" from "2001/95/EC"), or null
 * when the text cites no number. Used to decide whether a StreamDocument is
 * warranted and to de-duplicate them.
 */
export function regulationNumber(text) {
  const m = /\b(\d{4}\/\d{1,4}|\d{1,4}\/\d{4})\b/.exec(String(text ?? ''));
  return m ? m[1] : null;
}
