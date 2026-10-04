/**
 * The ONLY file in the front components that talks to Twenty's data API.
 *
 * Uses the per-app generated GraphQL client (`CoreApiClient` from
 * `twenty-client-sdk/core`). The published package ships a stub whose
 * `query` is `any`; `twenty dev` / `twenty dev:build` regenerates it from the
 * workspace schema, after which these selections are type-checked against the
 * real `arMandate(s)` / `pricingStrategy` / `priceItems` resolvers. The
 * components only see the functions below and render a graceful fallback on
 * any error.
 */
import { CoreApiClient } from 'twenty-client-sdk/core';

export type MandateRecord = {
  id: string;
  name: string | null;
  renewalDate: string | null;
  urgency: string | null;
  status: string | null;
};

const MANDATE_SELECTION = {
  id: true,
  name: true,
  renewalDate: true,
  urgency: true,
  status: true,
} as const;

export async function fetchMandate(recordId: string): Promise<MandateRecord | null> {
  const { arMandate } = await new CoreApiClient().query({
    arMandate: {
      __args: { filter: { id: { eq: recordId } } },
      ...MANDATE_SELECTION,
    },
  });
  return (arMandate ?? null) as MandateRecord | null;
}

/** All mandates that have a renewal date, soonest renewal first (max 500). */
export async function fetchMandatesWithRenewalDate(): Promise<MandateRecord[]> {
  const { arMandates } = await new CoreApiClient().query({
    arMandates: {
      __args: {
        filter: { renewalDate: { is: 'NOT_NULL' } },
        orderBy: [{ renewalDate: 'AscNullsLast' }],
        first: 500,
      },
      edges: { node: MANDATE_SELECTION },
    },
  });
  return ((arMandates?.edges ?? []) as Array<{ node: MandateRecord }>).map((edge) => edge.node);
}

// ------------------------------------------------------- C1 pricing preview

export type PricingStrategyRecord = {
  id: string;
  correlationId: string | null;
  name: string | null;
  strategyType: string | null;
  description: { markdown: string | null } | null;
  displayMode: string | null;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  sortOrder: number | null;
};

export type PriceItemRecord = {
  id: string;
  strategyId: string | null;
  correlationId: string | null;
  name: string | null;
  tier: string | null;
  annualFeeEur: number | null;
  setupFeeEur: number | null;
  currencyCode: string | null;
  isHighlighted: boolean;
  isOnRequest: boolean;
  sortOrder: number | null;
};

/** One pricing strategy and its price items (max 200), for the PricingDisplay preview. */
export async function fetchPricingStrategy(
  recordId: string,
): Promise<{ strategy: PricingStrategyRecord | null; items: PriceItemRecord[] }> {
  const { pricingStrategy, priceItems } = await new CoreApiClient().query({
    pricingStrategy: {
      __args: { filter: { id: { eq: recordId } } },
      id: true,
      correlationId: true,
      name: true,
      strategyType: true,
      description: { markdown: true },
      displayMode: true,
      isActive: true,
      validFrom: true,
      validUntil: true,
      sortOrder: true,
    },
    priceItems: {
      __args: {
        filter: { strategyId: { eq: recordId } },
        orderBy: [{ sortOrder: 'AscNullsLast' }],
        first: 200,
      },
      edges: {
        node: {
          id: true,
          strategyId: true,
          correlationId: true,
          name: true,
          tier: true,
          annualFeeEur: true,
          setupFeeEur: true,
          currencyCode: true,
          isHighlighted: true,
          isOnRequest: true,
          sortOrder: true,
        },
      },
    },
  });
  return {
    strategy: (pricingStrategy ?? null) as PricingStrategyRecord | null,
    items: ((priceItems?.edges ?? []) as Array<{ node: PriceItemRecord }>).map((edge) => edge.node),
  };
}
