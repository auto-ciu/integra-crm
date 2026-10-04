/**
 * stripe-webhook — REST sidecar (F0.3b) Lambda, C2. Stripe POSTs its events
 * here; the request is authenticated by Stripe's signature (`Stripe-Signature`
 * checked against STRIPE_WEBHOOK_SECRET), not by OPS_TOKEN.
 *
 * Handled for now, and only logged (the CRM is the source of truth for
 * pricing, so nothing is written back):
 *   - price.created / price.updated      → the price id, lookup key and amount
 *   - checkout.session.completed         → session id and customer, for C3
 *                                          (sync-portal-event will consume it)
 * Any other event type is acknowledged and ignored, so Stripe does not retry it.
 *
 * Responds 200 `{ received: true, eventType }`; 400 for a missing or wrong
 * signature or a body that is not an event; 503 when the secret is not set.
 * Only ids and amounts are logged, never customer details.
 *
 * Env: STRIPE_WEBHOOK_SECRET (whsec_…, from the Stripe webhook endpoint).
 */
import { verifyStripeSignature } from '../../shared/stripe-sync.mjs';
import { json, type HttpEvent, type HttpResult } from './lib/sidecar';

type StripeEvent = { id?: string; type?: string; data?: { object?: Record<string, unknown> } };

/** The log line for the events this function handles; null for the rest. */
function describe(event: StripeEvent): Record<string, unknown> | null {
  const object = event.data?.object ?? {};
  switch (event.type) {
    case 'price.created':
    case 'price.updated':
      return { price: object.id, lookupKey: object.lookup_key, unitAmount: object.unit_amount, currency: object.currency, active: object.active };
    case 'checkout.session.completed':
      return { session: object.id, customer: object.customer, mode: object.mode, amountTotal: object.amount_total, currency: object.currency };
    default:
      return null;
  }
}

export const handler = async (event: HttpEvent, now = new Date()): Promise<HttpResult> => {
  if (event.requestContext?.http?.method && event.requestContext.http.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return json(503, { error: 'stripe_webhook_not_configured' });

  // The signature covers the exact bytes Stripe sent, so verify before parsing.
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body ?? '';
  const headers = Object.fromEntries(Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (!verifyStripeSignature(rawBody, headers['stripe-signature'], secret, now)) {
    return json(400, { error: 'invalid_signature' });
  }

  let stripeEvent: StripeEvent;
  try {
    stripeEvent = JSON.parse(rawBody);
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  if (typeof stripeEvent.type !== 'string') return json(400, { error: 'invalid_event' });

  const detail = describe(stripeEvent);
  if (detail) console.log(`[stripe-webhook] ${stripeEvent.type}`, { eventId: stripeEvent.id, ...detail });
  return json(200, { received: true, eventType: stripeEvent.type });
};
