/**
 * The ONLY file in the front components that talks to Twenty's data API.
 *
 * Uses the per-app generated GraphQL client (`CoreApiClient` from
 * `twenty-client-sdk/core`). The published package ships a stub whose
 * `query` is `any`; `twenty dev` / `twenty dev:build` regenerates it from the
 * workspace schema, after which these selections are type-checked against the
 * real `arMandate` / `arMandates` resolvers. The components only see the two
 * functions below and render a graceful fallback on any error.
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
