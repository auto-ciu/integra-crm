/**
 * C2 Stripe sync: how CRM Offerings / PricePoints map onto Stripe
 * Products / Prices, and the webhook signature check. Single source of truth for:
 *   - src/functions/sync-pricing-to-stripe.ts   (reads the plan, applies it to Stripe)
 *   - src/functions/stripe-webhook.ts           (signature check)
 *   - ops/sync-to-stripe.mjs                    (--dry-run prints the plan)
 *   - verify-model.mjs                          (mapping rules, idempotency, signature)
 *
 * The CRM is the source of truth. Keys, so a re-run finds what the last one made:
 *   Product  id         = offering.offeringCode        (e.g. AR)
 *   Price    lookup_key = pricePoint.correlationId     (e.g. ar-beginner-2026)
 * A Stripe price's amount, currency, interval and product cannot be edited, so
 * a changed fee makes a new price that takes over the lookup key and archives
 * the old one (sync-pricing-to-stripe.ts). Plain ESM, dependency-free.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { displayFormatFor, hidesAmounts, isLive } from './public-pricing.mjs';

export const STRIPE_SOURCE = 'integra-crm';
/** Fees are annual subscriptions. */
export const PRICE_INTERVAL = 'year';
/** `annualFeeEur` is always euros; PricePoint.currencyCode converts nothing. */
export const STRIPE_CURRENCY = 'eur';

/** Metadata keys the sync owns: it sets them, and clears them when they stop applying. */
export const PRODUCT_METADATA_KEYS = ['offeringCode', 'source', 'strategyType'];
export const PRICE_METADATA_KEYS = ['correlationId', 'source', 'tier', 'offeringCode', 'displayFormat', 'highlighted'];

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

/** The Stripe Product an offering should be. */
export function desiredProduct(offering, today) {
  return {
    id: offering.offeringCode,
    name: offering.name,
    description: markdownOf(offering.description),
    // Offerings that never show an amount (contact CTA, hidden, quote-only) have no purchasable
    // product. Neither does one outside its validity window.
    active: isLive(offering, today) && !hidesAmounts(offering),
    metadata: present({ offeringCode: offering.offeringCode, source: STRIPE_SOURCE, strategyType: offering.strategyType }),
  };
}

/** The Stripe Price a price point should be, or `{ skip: reason }` when it gets none. */
export function desiredPrice(point, offering, today) {
  if (hidesAmounts(offering)) return { skip: 'offering_hidden' };
  if (!isLive(offering, today)) return { skip: 'offering_inactive' };
  if (point.isLegacy === true) return { skip: 'legacy' };
  // Seats are bought once, not subscribed: the yearly price below would bill them every year.
  if (offering.strategyType === 'PER_SEAT') return { skip: 'per_seat_not_synced' };
  if (point.isOnRequest === true) return { skip: 'on_request' };
  if (point.annualFeeEur === null || point.annualFeeEur === undefined || point.annualFeeEur === '') return { skip: 'no_amount' };
  const unitAmount = toCents(point.annualFeeEur);
  if (!Number.isFinite(unitAmount) || unitAmount < 0) return { skip: 'invalid_amount' };
  return {
    lookupKey: point.correlationId,
    productId: offering.offeringCode,
    unitAmount,
    currency: STRIPE_CURRENCY,
    interval: PRICE_INTERVAL,
    nickname: point.name,
    active: true,
    metadata: present({
      correlationId: point.correlationId,
      source: STRIPE_SOURCE,
      tier: point.tier,
      offeringCode: offering.offeringCode,
      displayFormat: displayFormatFor(offering),
      highlighted: point.isHighlighted === true ? 'true' : undefined,
    }),
  };
}

/**
 * Which offerings and price points one request covers. No filter: every live
 * offering. `offeringId` / `correlationIds` pick offerings by CRM id or
 * offeringCode; a correlationId that names a price point selects that point's
 * offering but only that point.
 */
export function planSync(offerings, pricePoints, { offeringId, correlationIds } = {}, today = new Date().toISOString().slice(0, 10)) {
  const wanted = new Set(correlationIds ?? []);
  const filtered = Boolean(offeringId) || wanted.size > 0;
  const products = [];
  const prices = [];
  /** @type {Array<{ correlationId: string, reason: string }>} */
  const skipped = [];

  const byOffering = new Map();
  for (const point of pricePoints) {
    const list = byOffering.get(point.offeringId) ?? [];
    list.push(point);
    byOffering.set(point.offeringId, list);
  }
  const bySortOrder = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

  for (const offering of [...offerings].sort(bySortOrder)) {
    if (!offering.offeringCode) continue; // nothing to key the Stripe product on
    const points = (byOffering.get(offering.id) ?? []).sort(bySortOrder);
    let covered = points;
    if (filtered) {
      const whole = offering.id === offeringId || wanted.has(offering.offeringCode);
      const named = points.filter((p) => wanted.has(p.correlationId));
      if (!whole && named.length === 0) continue;
      if (!whole) covered = named;
    } else if (!isLive(offering, today)) {
      continue;
    }

    products.push({ offeringId: offering.id, ...desiredProduct(offering, today) });
    for (const point of covered) {
      if (!point.correlationId) {
        skipped.push({ correlationId: String(point.name ?? point.id), reason: 'no_correlation_id' });
        continue;
      }
      const price = desiredPrice(point, offering, today);
      if ('skip' in price) skipped.push({ correlationId: point.correlationId, reason: String(price.skip) });
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
