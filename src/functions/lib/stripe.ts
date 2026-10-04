/**
 * Minimal Stripe REST client for the sidecar (C2): plain fetch, form-encoded
 * bodies, no `stripe` package (same approach as ops/lib/twenty-api.ts). Only
 * the Product / Price calls the pricing sync needs. Not a Twenty app entity.
 *
 * Env: STRIPE_SECRET_KEY (sk_test_… / sk_live_…, or a restricted key that can
 * write Products and Prices).
 */
import { stripeMode } from '../../../shared/stripe-sync.mjs';

export type StripeConfig = { apiKey: string; mode: 'test' | 'live' };

export class StripeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** Stripe's error `code` (e.g. resource_missing) and `type`, safe to return to callers. */
    readonly code?: string,
    readonly type?: string,
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

/** null when STRIPE_SECRET_KEY is unset or is not a Stripe secret key. */
export function stripeFromEnv(env: Record<string, string | undefined> = process.env): StripeConfig | null {
  const apiKey = env.STRIPE_SECRET_KEY;
  const mode = stripeMode(apiKey);
  return apiKey && mode ? { apiKey, mode } : null;
}

type FormValue = string | number | boolean | undefined | FormValue[] | { [key: string]: FormValue };

/** Stripe's nested form encoding: `metadata[tier]=BOOST`, `recurring[interval]=year`, `lookup_keys[]=a`. */
export function formEncode(params: { [key: string]: FormValue }): string {
  const pairs: string[] = [];
  const add = (key: string, value: FormValue) => {
    if (value === undefined) return;
    if (Array.isArray(value)) value.forEach((v) => add(`${key}[]`, v));
    else if (typeof value === 'object') Object.entries(value).forEach(([k, v]) => add(`${key}[${k}]`, v));
    else pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  };
  Object.entries(params).forEach(([k, v]) => add(k, v));
  return pairs.join('&');
}

async function call<T>(config: StripeConfig, method: 'GET' | 'POST', path: string, params: { [key: string]: FormValue } = {}): Promise<T> {
  const body = formEncode(params);
  const query = method === 'GET' && body ? `?${body}` : '';
  let response: Response;
  try {
    response = await fetch(`https://api.stripe.com${path}${query}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: method === 'POST' ? body : undefined,
    });
  } catch (error) {
    throw new StripeError(`${method} ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const text = await response.text();
  let parsed: { error?: { code?: string; type?: string; message?: string } } | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    throw new StripeError(`${method} ${path} → HTTP ${response.status}`, response.status, parsed?.error?.code, parsed?.error?.type);
  }
  return parsed as T;
}

export type StripeProduct = { id: string; name: string; description: string | null; active: boolean; metadata: Record<string, string> };
export type StripePrice = {
  id: string;
  active: boolean;
  currency: string;
  unit_amount: number | null;
  nickname: string | null;
  product: string | { id: string };
  recurring: { interval: string } | null;
  lookup_key: string | null;
  metadata: Record<string, string>;
};

export async function getProduct(config: StripeConfig, id: string): Promise<StripeProduct | null> {
  try {
    return await call<StripeProduct>(config, 'GET', `/v1/products/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof StripeError && error.code === 'resource_missing') return null;
    throw error;
  }
}

export const createProduct = (config: StripeConfig, params: { [key: string]: FormValue }) => call<StripeProduct>(config, 'POST', '/v1/products', params);
export const updateProduct = (config: StripeConfig, id: string, params: { [key: string]: FormValue }) =>
  call<StripeProduct>(config, 'POST', `/v1/products/${encodeURIComponent(id)}`, params);

/** The price holding a lookup key, active or archived. */
export async function findPriceByLookupKey(config: StripeConfig, lookupKey: string): Promise<StripePrice | null> {
  const list = await call<{ data: StripePrice[] }>(config, 'GET', '/v1/prices', { lookup_keys: [lookupKey], limit: 1 });
  return list.data[0] ?? null;
}

export const createPrice = (config: StripeConfig, params: { [key: string]: FormValue }) => call<StripePrice>(config, 'POST', '/v1/prices', params);
export const updatePrice = (config: StripeConfig, id: string, params: { [key: string]: FormValue }) =>
  call<StripePrice>(config, 'POST', `/v1/prices/${encodeURIComponent(id)}`, params);
