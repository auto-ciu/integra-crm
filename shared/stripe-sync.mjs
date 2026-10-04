/**
 * C2 Stripe sync: how CRM PricingStrategies / PriceItems map onto Stripe
 * Products / Prices, and the webhook signature check. Single source of truth for:
 *   - src/functions/sync-pricing-to-stripe.ts   (reads the plan, applies it to Stripe)
 *   - src/functions/stripe-webhook.ts           (signature check)
 *   - ops/sync-to-stripe.mjs                    (--dry-run prints the plan)
 *   - verify-model.mjs                          (mapping rules, idempotency, signature)
 *
 * The CRM is the source of truth. Keys, so a re-run finds what the last one made:
 *   Product  id         = strategy.correlationId   (e.g. ar-2026)
 *   Price    lookup_key = item.correlationId       (e.g. ar-beginner-2026)
 * A Stripe price's amount, currency, interval and product cannot be edited, so
 * a changed fee makes a new price that takes over the lookup key and archives
 * the old one (sync-pricing-to-stripe.ts). Plain ESM, dependency-free.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { displayModeFor, isLive } from './pricing.mjs';

export const STRIPE_SOURCE = 'integra-crm';
/** Fees are annual subscriptions. */
export const PRICE_INTERVAL = 'year';
/** `annualFeeEur` is always euros; PriceItem.currencyCode converts nothing. */
export const STRIPE_CURRENCY = 'eur';

/** Metadata keys the sync owns: it sets them, and clears them when they stop applying. */
export const PRODUCT_METADATA_KEYS = ['correlationId', 'source', 'strategyType'];
export const PRICE_METADATA_KEYS = ['correlationId', 'source', 'tier', 'productLine', 'displayMode', 'highlighted'];

/**
 * "test" or "live" from the shape of the secret key; null when it is not a Stripe secret / restricted key.
 * @returns {'test' | 'live' | null}
 */
export function stripeMode(key) {
  const m = /^[sr]k_(test|live)_[A-Za-z0-9]+$/.exec(String(key ?? ''));
  return m ? m[1] : null;
}

/** EUR → integer cents; rounds so 19.99 gives 1999, not 1998.999…. */
export const toCents = (eur) => Math.round(Number(eur) * 100);

const markdownOf = (richText) => (typeof richText === 'string' ? richText : richText?.markdown ?? '').trim();
const present = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** The Stripe Product a strategy should be. */
export function desiredProduct(strategy, today) {
  const hidden = displayModeFor(strategy) === 'HIDE';
  return {
    id: strategy.correlationId,
    name: strategy.name,
    description: markdownOf(strategy.description),
    // HIDE strategies are "on request": no purchasable product. Neither is one outside its validity window.
    active: isLive(strategy, today) && !hidden,
    metadata: present({ correlationId: strategy.correlationId, source: STRIPE_SOURCE, strategyType: strategy.strategyType }),
  };
}

/** The Stripe Price an item should be, or `{ skip: reason }` when it gets none. */
export function desiredPrice(item, strategy, today) {
  if (displayModeFor(strategy) === 'HIDE') return { skip: 'strategy_hidden' };
  if (!isLive(strategy, today)) return { skip: 'strategy_inactive' };
  if (item.isOnRequest === true) return { skip: 'on_request' };
  if (item.annualFeeEur === null || item.annualFeeEur === undefined || item.annualFeeEur === '') return { skip: 'no_amount' };
  const unitAmount = toCents(item.annualFeeEur);
  if (!Number.isFinite(unitAmount) || unitAmount < 0) return { skip: 'invalid_amount' };
  return {
    lookupKey: item.correlationId,
    productId: strategy.correlationId,
    unitAmount,
    currency: STRIPE_CURRENCY,
    interval: PRICE_INTERVAL,
    nickname: item.name,
    active: true,
    metadata: present({
      correlationId: item.correlationId,
      source: STRIPE_SOURCE,
      tier: item.tier,
      productLine: item.productLine,
      displayMode: displayModeFor(strategy),
      highlighted: item.isHighlighted === true ? 'true' : undefined,
    }),
  };
}

/**
 * Which strategies and items one request covers. No filter: every live
 * strategy. `strategyId` / `correlationIds` pick strategies by CRM id or
 * correlationId; a correlationId that names an item selects that item's
 * strategy but only that item.
 */
export function planSync(strategies, items, { strategyId, correlationIds } = {}, today = new Date().toISOString().slice(0, 10)) {
  const wanted = new Set(correlationIds ?? []);
  const filtered = Boolean(strategyId) || wanted.size > 0;
  const products = [];
  const prices = [];
  /** @type {Array<{ correlationId: string, reason: string }>} */
  const skipped = [];

  const byStrategy = new Map();
  for (const item of items) {
    const list = byStrategy.get(item.strategyId) ?? [];
    list.push(item);
    byStrategy.set(item.strategyId, list);
  }
  const bySortOrder = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

  for (const strategy of [...strategies].sort(bySortOrder)) {
    if (!strategy.correlationId) continue; // nothing to key the Stripe product on
    const strategyItems = (byStrategy.get(strategy.id) ?? []).sort(bySortOrder);
    let covered = strategyItems;
    if (filtered) {
      const whole = strategy.id === strategyId || wanted.has(strategy.correlationId);
      const named = strategyItems.filter((i) => wanted.has(i.correlationId));
      if (!whole && named.length === 0) continue;
      if (!whole) covered = named;
    } else if (!isLive(strategy, today)) {
      continue;
    }

    products.push({ strategyId: strategy.id, ...desiredProduct(strategy, today) });
    for (const item of covered) {
      if (!item.correlationId) {
        skipped.push({ correlationId: String(item.name ?? item.id), reason: 'no_correlation_id' });
        continue;
      }
      const price = desiredPrice(item, strategy, today);
      if ('skip' in price) skipped.push({ correlationId: item.correlationId, reason: String(price.skip) });
      else prices.push(price);
    }
  }
  return { products, prices, skipped };
}

/**
 * The metadata to send so Stripe ends up with `desired`: changed or new keys,
 * and an empty string (Stripe's "unset") for a managed key that no longer
 * applies. `{}` means nothing to change.
 * @param {Record<string, string>} desired
 * @param {Record<string, string> | undefined} existing
 * @param {string[]} managedKeys
 * @returns {Record<string, string>}
 */
export function metadataPatch(desired, existing, managedKeys) {
  const patch = {};
  for (const key of managedKeys) {
    const want = desired[key] ?? '';
    const have = existing?.[key] ?? '';
    if (want !== have) patch[key] = want;
  }
  return patch;
}

// ------------------------------------------------------ webhook signature

export const WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Stripe-Signature check: header `t=<unix>,v1=<hex>[,v1=…]`, where v1 is
 * HMAC-SHA256(secret, `${t}.${rawBody}`). `rawBody` must be the bytes Stripe
 * sent, not re-serialised JSON. Rejects a timestamp outside the tolerance.
 */
export function verifyStripeSignature(rawBody, header, secret, now = new Date(), toleranceSeconds = WEBHOOK_TOLERANCE_SECONDS) {
  if (!secret || !header) return false;
  const parts = String(header).split(',').map((p) => p.trim().split('='));
  const timestamp = parts.find(([k]) => k === 't')?.[1];
  const signatures = parts.filter(([k, v]) => k === 'v1' && v).map(([, v]) => v);
  if (!/^\d+$/.test(timestamp ?? '') || signatures.length === 0) return false;
  if (Math.abs(now.getTime() / 1000 - Number(timestamp)) > toleranceSeconds) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((sig) => {
    const given = Buffer.from(sig, 'hex');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Test helper and documentation of the header format: sign `rawBody` the way Stripe does. */
export function signStripePayload(rawBody, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${v1}`;
}
