/**
 * C1 pricing engine. Single source of truth for:
 *   - src/options.ts                  (PricingStrategy / PriceItem select options)
 *   - ops/seed-pricing.mjs            (the canonical strategies and price items)
 *   - ops/publish-pricing.mjs         (CRM records → public pricing.json)
 *   - src/front-components/PricingDisplay.tsx  (CRM preview of the public display)
 *   - verify-model.mjs                (D3 display rules, seed shape, transform)
 *
 * Amounts are always EUR (`annualFeeEur`, `setupFeeEur`). The currency is the
 * invoicing currency and converts nothing: PriceItem.currencyCode in the CRM
 * (Twenty reserves `currency`), `currency` in pricing.json. Plain ESM so the
 * ops scripts and the static check need no build.
 */

export const STRATEGY_TYPES = [
  { value: 'TIERED', label: 'Tiered · 分级', color: 'blue' },
  { value: 'BUNDLE', label: 'Bundle · 组合', color: 'turquoise' },
  { value: 'FLAT', label: 'Flat · 固定价', color: 'green' },
  { value: 'PER_SEAT', label: 'Per seat · 按席位', color: 'sky' },
  { value: 'ADD_ON', label: 'Add-on · 附加', color: 'purple' },
  { value: 'QUOTE_ONLY', label: 'Quote only · 仅报价', color: 'orange' },
  { value: 'CUSTOM', label: 'Custom · 定制', color: 'gray' },
];

/** How the public website shows a strategy's prices. */
export const DISPLAY_MODES = [
  { value: 'SHOW_FROM_PRICE', label: 'From price · 起价', color: 'purple' },
  { value: 'SHOW_EXACT_TOTAL', label: 'Exact total · 总价', color: 'green' },
  { value: 'SHOW_PER_OPTION', label: 'Per option · 逐项', color: 'blue' },
  { value: 'HIDE', label: 'Hide (on request) · 隐藏', color: 'gray' },
];

/**
 * D3 decision: the default display mode for each strategy type. The seed
 * applies it; staff may override displayMode per strategy, and the publisher
 * falls back to it when displayMode is empty. PER_SEAT is not covered by D3;
 * it lists each seat option like TIERED.
 */
export const DISPLAY_MODE_FOR_TYPE = {
  TIERED: 'SHOW_PER_OPTION',
  BUNDLE: 'SHOW_PER_OPTION',
  PER_SEAT: 'SHOW_PER_OPTION',
  FLAT: 'SHOW_EXACT_TOTAL',
  ADD_ON: 'SHOW_FROM_PRICE',
  QUOTE_ONLY: 'HIDE',
  CUSTOM: 'HIDE',
};

export const PRICE_PRODUCT_LINES = [
  { value: 'DPP', label: 'DPP', color: 'blue' },
  { value: 'AR', label: 'AR', color: 'purple' },
  { value: 'BUNDLE', label: 'Bundle · 组合', color: 'turquoise' },
  { value: 'TRAINING', label: 'Training · 培训', color: 'green' },
  { value: 'OTHER', label: 'Other · 其他', color: 'gray' },
];

/** Same values as the TIER select in src/options.ts (Company / Opportunity). */
export const PRICE_TIERS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'BOOST', label: 'Boost' },
  { value: 'BUILDER', label: 'Builder' },
  { value: 'BOSS', label: 'Boss' },
];

export const CURRENCIES = [
  { value: 'EUR', label: 'EUR €', color: 'blue' },
  { value: 'CNY', label: 'CNY ¥', color: 'red' },
  { value: 'USD', label: 'USD $', color: 'green' },
  { value: 'GBP', label: 'GBP £', color: 'purple' },
];

export const DEFAULT_CURRENCY = 'EUR';

export const tierLabel = (tier) => PRICE_TIERS.find((t) => t.value === tier)?.label ?? null;

export const displayModeFor = (strategy) =>
  strategy.displayMode || DISPLAY_MODE_FOR_TYPE[strategy.strategyType] || 'HIDE';

// --------------------------------------------------------------- seed data

/** BUNDLE = DPP + AR at the same tier, less this discount (verify-model.mjs checks it). */
export const BUNDLE_DISCOUNT = 0.15;

const PRICING_YEAR = 2026;
const TIER_ORDER = PRICE_TIERS.map((t) => t.value);

/** One TIERED/BUNDLE ladder: fees in tier order, null = Boss (on request). */
const ladder = ({ prefix, productLine, label, fees, strategySortOrder }) =>
  TIER_ORDER.map((tier, i) => ({
    correlationId: `${prefix}-${tier.toLowerCase()}-${PRICING_YEAR}`,
    name: `${label} ${tierLabel(tier)}`,
    productLine,
    tier,
    annualFeeEur: fees[i],
    setupFeeEur: null,
    currencyCode: DEFAULT_CURRENCY,
    isHighlighted: false,
    isOnRequest: fees[i] === null,
    // Strategy-major so the flat Price Items table groups by strategy.
    sortOrder: strategySortOrder * 10 + i,
  }));

/**
 * The canonical strategies and their items. `correlationId` is the stable
 * lookup key (Stripe sync, public `id`) and must never change once seeded.
 */
export const PRICING_STRATEGIES = [
  {
    correlationId: `dsp-${PRICING_YEAR}`,
    name: 'DSP — Digital Product Passport',
    strategyType: 'TIERED',
    description: 'Digital product passport service, annual subscription by tier.',
    sortOrder: 0,
    items: ladder({ prefix: 'dpp', productLine: 'DPP', label: 'DPP', fees: [950, 2500, 6000, null], strategySortOrder: 0 }),
  },
  {
    correlationId: `ar-${PRICING_YEAR}`,
    name: 'AR — EU Authorised Representative',
    strategyType: 'TIERED',
    description: 'EU authorised representative mandate, annual fee by tier.',
    sortOrder: 1,
    items: ladder({ prefix: 'ar', productLine: 'AR', label: 'AR Mandate', fees: [250, 1200, 3000, null], strategySortOrder: 1 }),
  },
  {
    correlationId: `bundle-${PRICING_YEAR}`,
    name: 'Bundle — DPP + AR',
    strategyType: 'BUNDLE',
    description: 'DPP and EU authorised representative together, 15% below the two tiers bought separately.',
    sortOrder: 2,
    items: ladder({ prefix: 'bundle', productLine: 'BUNDLE', label: 'Bundle', fees: [1020, 3145, 7650, null], strategySortOrder: 2 }),
  },
].map((s) => ({
  ...s,
  displayMode: DISPLAY_MODE_FOR_TYPE[s.strategyType],
  isActive: true,
  validFrom: `${PRICING_YEAR}-01-01`,
  validUntil: null,
}));

// ------------------------------------------------- public pricing.json

const isoDay = (d) => d.toISOString().slice(0, 10);

/** Active, and `today` (YYYY-MM-DD) within validFrom..validUntil inclusive. Dates may be null. */
export const isLive = (strategy, today) =>
  strategy.isActive === true &&
  (!strategy.validFrom || strategy.validFrom.slice(0, 10) <= today) &&
  (!strategy.validUntil || strategy.validUntil.slice(0, 10) >= today);

const markdownOf = (richText) => (typeof richText === 'string' ? richText : richText?.markdown ?? '');
const bySortOrder = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

/**
 * CRM records (REST shape: PricingStrategy with `id`, PriceItem with
 * `strategyId`) → the public pricing.json document. The filter is the point:
 *   - only live strategies (isActive, inside the validity window);
 *   - only public fields — no CRM ids, no internal descriptions of items;
 *   - an on-request item, and every item of a HIDE strategy, carries no
 *     amounts, so a hidden price can never leak to the website.
 */
export function buildPublicPricing(strategies, items, now = new Date()) {
  const today = isoDay(now);
  return {
    publishedAt: now.toISOString(),
    strategies: strategies
      .filter((s) => isLive(s, today))
      .sort(bySortOrder)
      .map((s) => {
        const displayMode = displayModeFor(s);
        const hidden = displayMode === 'HIDE';
        return {
          id: s.correlationId,
          name: s.name,
          type: s.strategyType,
          description: markdownOf(s.description),
          displayMode,
          items: items
            .filter((i) => i.strategyId === s.id)
            .sort(bySortOrder)
            .map((i) => {
              const isOnRequest = hidden || i.isOnRequest === true || i.annualFeeEur == null;
              return {
                correlationId: i.correlationId,
                name: i.name,
                tier: i.tier ?? null,
                tierLabel: tierLabel(i.tier),
                annualFeeEur: isOnRequest ? null : i.annualFeeEur,
                setupFeeEur: isOnRequest ? null : i.setupFeeEur ?? null,
                currency: i.currencyCode || DEFAULT_CURRENCY,
                isHighlighted: i.isHighlighted === true,
                isOnRequest,
              };
            }),
        };
      }),
  };
}

// ------------------------------------------------------------- display copy

export const ON_REQUEST = 'On request';

const eur = (decimals) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const EUR_WHOLE = eur(0);
const EUR_CENTS = eur(2);

/** "€2,500" for whole euros, "€99.50" otherwise. */
export const formatEur = (amount) => (Number.isInteger(amount) ? EUR_WHOLE : EUR_CENTS).format(amount);

/** One item's price: "€950/yr" or "On request". */
export const itemPriceLabel = (item) =>
  item.isOnRequest || item.annualFeeEur == null ? ON_REQUEST : `${formatEur(item.annualFeeEur)}/yr`;

/**
 * The one-line headline for a public strategy (pricing.json shape):
 *   SHOW_FROM_PRICE  → "from €950"   (cheapest priced item)
 *   SHOW_EXACT_TOTAL → "€950/yr"     (sum of the priced items)
 *   SHOW_PER_OPTION  → null          (render the per-option table instead)
 *   HIDE             → "On request"
 * Falls back to "On request" when nothing is priced.
 */
export function strategyHeadline(strategy) {
  const priced = strategy.items.filter((i) => !i.isOnRequest && i.annualFeeEur != null).map((i) => i.annualFeeEur);
  switch (strategy.displayMode) {
    case 'SHOW_PER_OPTION':
      return null;
    case 'SHOW_FROM_PRICE':
      return priced.length ? `from ${formatEur(Math.min(...priced))}` : ON_REQUEST;
    case 'SHOW_EXACT_TOTAL':
      return priced.length ? `${formatEur(priced.reduce((a, b) => a + b, 0))}/yr` : ON_REQUEST;
    default:
      return ON_REQUEST;
  }
}
