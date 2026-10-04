/**
 * The ONLY file in the front components that talks to Twenty's data API.
 *
 * Uses the per-app generated GraphQL client (`CoreApiClient` from
 * `twenty-client-sdk/core`). The published package ships a stub whose
 * `query` is `any`; `twenty dev` / `twenty dev:build` regenerates it from the
 * workspace schema, after which these selections are type-checked against the
 * real `arMandate(s)` / `offering` / `pricePoints` / `bundleItems` / `trainingEvent` /
 * `people` / `trainingRegistrations` resolvers. The components only see
 * the functions below and render a graceful fallback on any error.
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

export type OfferingRecord = {
  id: string;
  offeringCode: string | null;
  name: string | null;
  strategyType: string | null;
  displayFormat: string | null;
  fromPrefix: boolean;
  hasOptionalExtras: boolean;
  description: { markdown: string | null } | null;
  features: { markdown: string | null } | null;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  sortOrder: number | null;
};

export type PricePointRecord = {
  id: string;
  offeringId: string | null;
  correlationId: string | null;
  name: string | null;
  tier: string | null;
  annualFeeEur: number | null;
  currencyCode: string | null;
  isHighlighted: boolean;
  isOnRequest: boolean;
  isLegacy: boolean;
  description: string | null;
  sortOrder: number | null;
};

export type BundleItemRecord = {
  id: string;
  bundleId: string | null;
  componentId: string | null;
  included: boolean;
  sortOrder: number | null;
};

/**
 * One offering with its price points and, for a bundle, its components'
 * offerings (max 200 price points), for the PricingDisplay preview.
 */
export async function fetchOffering(recordId: string): Promise<{
  offering: OfferingRecord | null;
  pricePoints: PricePointRecord[];
  bundleItems: BundleItemRecord[];
  components: OfferingRecord[];
}> {
  const { offering, pricePoints, bundleItems } = await new CoreApiClient().query({
    offering: {
      __args: { filter: { id: { eq: recordId } } },
      id: true,
      offeringCode: true,
      name: true,
      strategyType: true,
      displayFormat: true,
      fromPrefix: true,
      hasOptionalExtras: true,
      description: { markdown: true },
      features: { markdown: true },
      isActive: true,
      validFrom: true,
      validUntil: true,
      sortOrder: true,
    },
    pricePoints: {
      __args: {
        filter: { offeringId: { eq: recordId } },
        orderBy: [{ sortOrder: 'AscNullsLast' }],
        first: 200,
      },
      edges: {
        node: {
          id: true,
          offeringId: true,
          correlationId: true,
          name: true,
          tier: true,
          annualFeeEur: true,
          currencyCode: true,
          isHighlighted: true,
          isOnRequest: true,
          isLegacy: true,
          description: true,
          sortOrder: true,
        },
      },
    },
    bundleItems: {
      __args: {
        filter: { bundleId: { eq: recordId } },
        orderBy: [{ sortOrder: 'AscNullsLast' }],
        first: 50,
      },
      edges: {
        node: { id: true, bundleId: true, componentId: true, included: true, sortOrder: true },
      },
    },
  });
  const items = ((bundleItems?.edges ?? []) as Array<{ node: BundleItemRecord }>).map((edge) => edge.node);
  const componentIds = items.map((i) => i.componentId).filter((id): id is string => Boolean(id));
  let components: OfferingRecord[] = [];
  if (componentIds.length) {
    const { offerings } = await new CoreApiClient().query({
      offerings: {
        __args: { filter: { id: { in: componentIds } }, first: 50 },
        edges: {
          node: { id: true, offeringCode: true, name: true, strategyType: true, isActive: true, validFrom: true, validUntil: true },
        },
      },
    });
    components = ((offerings?.edges ?? []) as Array<{ node: OfferingRecord }>).map((edge) => edge.node);
  }
  return {
    offering: (offering ?? null) as OfferingRecord | null,
    pricePoints: ((pricePoints?.edges ?? []) as Array<{ node: PricePointRecord }>).map((edge) => edge.node),
    bundleItems: items,
    components,
  };
}

// ------------------------------------------------- X5 training registration

export type TrainingEventRecord = { id: string; name: string | null; date: string | null; location: string | null };

export type PersonRecord = {
  id: string;
  name: { firstName: string | null; lastName: string | null } | null;
  companyId: string | null;
};

export async function fetchTrainingEvent(recordId: string): Promise<TrainingEventRecord | null> {
  const { trainingEvent } = await new CoreApiClient().query({
    trainingEvent: {
      __args: { filter: { id: { eq: recordId } } },
      id: true,
      name: true,
      date: true,
      location: true,
    },
  });
  return (trainingEvent ?? null) as TrainingEventRecord | null;
}

/** The Person whose primary e-mail is `email` (case as stored), or null. */
export async function findPersonByEmail(email: string): Promise<PersonRecord | null> {
  const { people } = await new CoreApiClient().query({
    people: {
      __args: { filter: { emails: { primaryEmail: { eq: email } } }, first: 1 },
      edges: { node: { id: true, name: { firstName: true, lastName: true }, companyId: true } },
    },
  });
  return ((people?.edges ?? []) as Array<{ node: PersonRecord }>)[0]?.node ?? null;
}

/** Id of the person's registration for the event that is not CANCELLED, or null. */
export async function findActiveRegistration(trainingEventId: string, personId: string): Promise<string | null> {
  const { trainingRegistrations } = await new CoreApiClient().query({
    trainingRegistrations: {
      __args: {
        filter: { trainingEventId: { eq: trainingEventId }, personId: { eq: personId }, status: { neq: 'CANCELLED' } },
        first: 1,
      },
      edges: { node: { id: true } },
    },
  });
  return ((trainingRegistrations?.edges ?? []) as Array<{ node: { id: string } }>)[0]?.node.id ?? null;
}

// ------------------------------------------------------- B2 stream pipeline

export type StreamLineRecord = {
  opportunityId: string | null;
  stageName: string | null;
  stageOrder: number | null;
  estimatedValueEur: number | null;
  probability: number | null;
  expectedCloseDate: string | null;
  isActive: boolean | null;
};

/** Every active opportunity line of one stream, with its stage (max 500). */
export async function fetchStreamLines(streamId: string): Promise<StreamLineRecord[]> {
  const { opportunityLines } = await new CoreApiClient().query({
    opportunityLines: {
      __args: {
        filter: { streamId: { eq: streamId }, isActive: { eq: true } },
        first: 500,
      },
      edges: {
        node: {
          opportunityId: true,
          estimatedValueEur: true,
          probability: true,
          expectedCloseDate: true,
          isActive: true,
          stage: { stageName: true, order: true },
        },
      },
    },
  });
  type Node = Omit<StreamLineRecord, 'stageName' | 'stageOrder'> & {
    stage: { stageName: string | null; order: number | null } | null;
  };
  return ((opportunityLines?.edges ?? []) as Array<{ node: Node }>).map(({ node: { stage, ...line } }) => ({
    ...line,
    stageName: stage?.stageName ?? null,
    stageOrder: stage?.order ?? null,
  }));
}
