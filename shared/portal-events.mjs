/**
 * C3 portal ↔ CRM sync: customer event types and sources, and which events
 * touch the pipeline. Single source of truth for:
 *   - src/options.ts                       (CustomerEvent select options)
 *   - src/functions/sync-portal-event.ts   (payload validation, opportunity rules)
 *   - verify-model.mjs                     (option values, pipeline rules)
 *
 * Plain ESM so the sidecar, the ops scripts and the static check need no build.
 */

export const CUSTOMER_EVENT_TYPES = [
  { value: 'PURCHASE', label: 'Purchase · 购买', color: 'green' },
  { value: 'RENEWAL', label: 'Renewal · 续费', color: 'turquoise' },
  { value: 'CANCELLATION', label: 'Cancellation · 取消', color: 'red' },
  { value: 'UPGRADE', label: 'Upgrade · 升级', color: 'blue' },
  { value: 'DOWNGRADE', label: 'Downgrade · 降级', color: 'orange' },
  { value: 'SUPPORT', label: 'Support · 支持', color: 'purple' },
  { value: 'LOGIN', label: 'Login · 登录', color: 'gray' },
];

export const CUSTOMER_EVENT_SOURCES = [
  { value: 'STRIPE', label: 'Stripe', color: 'purple' },
  { value: 'PORTAL', label: 'Portal · 门户', color: 'blue' },
  { value: 'MANUAL', label: 'Manual · 手动', color: 'gray' },
];

/** Only a purchase or a renewal puts the customer on the Subscribed stage of the pipeline. */
export const OPPORTUNITY_EVENT_TYPES = ['PURCHASE', 'RENEWAL'];
export const OPPORTUNITY_STAGE_ON_PAYMENT = 'SUBSCRIBED';
/** A lost opportunity is closed business: a new payment opens a new one rather than reviving it. */
export const CLOSED_OPPORTUNITY_STAGES = ['LOST'];

export const touchesOpportunity = (eventType) => OPPORTUNITY_EVENT_TYPES.includes(eventType);

/** `customer` is an e-mail address or a company name. */
export const isEmail = (customer) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(customer ?? '').trim());

/** The record's label: "<EVENT_TYPE> — <customer>". */
export const eventName = (eventType, customer) => `${eventType} — ${String(customer).trim()}`.slice(0, 200);
