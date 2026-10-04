/**
 * sync-pricing-to-stripe — REST sidecar (F0.3b) Lambda, C2. POST
 * `{ strategyId?, correlationIds[]? }` with bearer OPS_TOKEN; ops/sync-to-stripe.mjs
 * calls it, and it can be triggered after any pricing change.
 *
 * Reads the CRM's PricingStrategies and PriceItems (no filter: every live
 * strategy) and makes Stripe match. The CRM is the source of truth:
 *   - each strategy → a Product, id = strategy.correlationId; a HIDE strategy
 *     (or one outside its validity window) is `active: false`;
 *   - each item → a recurring yearly Price in EUR cents (annualFeeEur × 100),
 *     lookup_key = item.correlationId, on its strategy's Product. An on-request
 *     item, and any item of a HIDE / inactive strategy, gets no price;
 *   - tier, product line, D3 display mode and `highlighted` go in metadata.
 *
 * Idempotent: Stripe is read first and only what differs is written, so the
 * same input twice leaves the same state (the second run reports `unchanged`).
 * Stripe cannot edit a price's amount, so a changed fee creates a new price
 * that takes over the lookup key, then archives the old one (`replaced`).
 * Nothing is ever deleted: Stripe prices that have been used cannot be.
 *
 * Responds 200 `{ productsSynced, pricesSynced, pricesSkipped, stripeMode,
 * changes[] }`; `changes` lists each product / price with what was done.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can read
 * pricingStrategies / priceItems), STRIPE_SECRET_KEY, OPS_TOKEN.
 */
import { z } from 'zod';

import { TwentyApiError, configFromEnv, findAllRecords, type TwentyConfig } from '../../ops/lib/twenty-api';
import { PRICE_METADATA_KEYS, PRODUCT_METADATA_KEYS, metadataPatch, planSync } from '../../shared/stripe-sync.mjs';
import {
  StripeError,
  createPrice,
  createProduct,
  findPriceByLookupKey,
  getProduct,
  stripeFromEnv,
  updatePrice,
  updateProduct,
  type StripeConfig,
} from './lib/stripe';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

// ------------------------------------------------------------------ payload

export const SyncPayload = z.object({
  strategyId: z.uuid().optional(),
  /** Strategy or price-item correlationIds; empty or absent = every live strategy. */
  correlationIds: z.array(z.string().trim().min(1).max(200)).max(200).optional(),
});
export type SyncPayload = z.infer<typeof SyncPayload>;

export type Change = {
  kind: 'product' | 'price';
  key: string;
  action: 'created' | 'updated' | 'replaced' | 'unchanged';
};
export type SyncResult = {
  productsSynced: number;
  pricesSynced: number;
  pricesSkipped: number;
  stripeMode: 'test' | 'live';
  changes: Change[];
  skipped: Array<{ correlationId: string; reason: string }>;
};

/** An expected refusal with its HTTP status. */
export class SyncError extends Error {
  constructor(
    readonly code: 'stripe_not_configured' | 'stripe_unavailable',
    readonly status: number,
    readonly detail: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'SyncError';
  }
}

// -------------------------------------------------------------------- sync

type Product = ReturnType<typeof planSync>['products'][number];
type Price = ReturnType<typeof planSync>['prices'][number];

async function syncProduct(stripe: StripeConfig, want: Product): Promise<Change['action']> {
  const have = await getProduct(stripe, want.id);
  if (!have) {
    await createProduct(stripe, {
      id: want.id,
      name: want.name,
      description: want.description || undefined,
      active: want.active,
      metadata: want.metadata,
    });
    return 'created';
  }
  const patch: Record<string, string | boolean | Record<string, string>> = {};
  if (have.name !== want.name) patch.name = want.name;
  if ((have.description ?? '') !== want.description) patch.description = want.description; // '' unsets
  if (have.active !== want.active) patch.active = want.active;
  const metadata = metadataPatch(want.metadata, have.metadata, PRODUCT_METADATA_KEYS);
  if (Object.keys(metadata).length) patch.metadata = metadata;
  if (Object.keys(patch).length === 0) return 'unchanged';
  await updateProduct(stripe, want.id, patch);
  return 'updated';
}

async function syncPrice(stripe: StripeConfig, want: Price): Promise<Change['action']> {
  const create = (extra: Record<string, string | boolean> = {}) =>
    createPrice(stripe, {
      product: want.productId,
      currency: want.currency,
      unit_amount: want.unitAmount,
      recurring: { interval: want.interval },
      lookup_key: want.lookupKey,
      nickname: want.nickname,
      metadata: want.metadata,
      ...extra,
    });

  const have = await findPriceByLookupKey(stripe, want.lookupKey);
  if (!have) {
    await create();
    return 'created';
  }

  const haveProduct = typeof have.product === 'string' ? have.product : have.product.id;
  const immutableChanged =
    have.unit_amount !== want.unitAmount ||
    have.currency !== want.currency ||
    have.recurring?.interval !== want.interval ||
    haveProduct !== want.productId;
  if (immutableChanged) {
    // New price first, taking the lookup key, then archive the old: the key never points at nothing.
    await create({ transfer_lookup_key: true });
    if (have.active) await updatePrice(stripe, have.id, { active: false });
    return 'replaced';
  }

  const patch: Record<string, string | boolean | Record<string, string>> = {};
  if (!have.active) patch.active = true;
  if ((have.nickname ?? '') !== want.nickname) patch.nickname = want.nickname;
  const metadata = metadataPatch(want.metadata, have.metadata, PRICE_METADATA_KEYS);
  if (Object.keys(metadata).length) patch.metadata = metadata;
  if (Object.keys(patch).length === 0) return 'unchanged';
  await updatePrice(stripe, have.id, patch);
  return 'updated';
}

export async function syncPricingToStripe(
  config: TwentyConfig,
  stripe: StripeConfig | null,
  p: SyncPayload,
  now = new Date(),
): Promise<SyncResult> {
  if (!stripe) throw new SyncError('stripe_not_configured', 503);

  const [strategies, items] = await Promise.all([findAllRecords(config, 'pricingStrategies'), findAllRecords(config, 'priceItems')]);
  const plan = planSync(strategies as never, items as never, p, now.toISOString().slice(0, 10));

  const changes: Change[] = [];
  let at = '';
  try {
    for (const product of plan.products) {
      at = product.id;
      changes.push({ kind: 'product', key: product.id, action: await syncProduct(stripe, product) });
    }
    for (const price of plan.prices) {
      at = price.lookupKey;
      changes.push({ kind: 'price', key: price.lookupKey, action: await syncPrice(stripe, price) });
    }
  } catch (error) {
    if (!(error instanceof StripeError)) throw error;
    console.error('[sync-pricing-to-stripe]', at, error.message, error.code);
    // Everything before `at` is done, and a re-run picks up from there.
    throw new SyncError('stripe_unavailable', 502, { at, stripeCode: error.code, stripeType: error.type, changes });
  }

  return {
    productsSynced: plan.products.length,
    pricesSynced: plan.prices.length,
    pricesSkipped: plan.skipped.length,
    stripeMode: stripe.mode,
    changes,
    skipped: plan.skipped,
  };
}

// ------------------------------------------------------------------ handler

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  const parsed = SyncPayload.safeParse(request.body ?? {});
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    return json(200, await syncPricingToStripe(configFromEnv(), stripeFromEnv(), parsed.data));
  } catch (error) {
    if (error instanceof SyncError) return json(error.status, { error: error.code, ...error.detail });
    console.error('[sync-pricing-to-stripe]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
