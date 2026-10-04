/**
 * link-mandate-pricing — REST sidecar (F0.3b) Lambda, C2. POST
 * `{ arMandateId, opportunityId?, dryRun? }` with bearer OPS_TOKEN.
 *
 * Prices an AR mandate into the pipeline (shared/agreement-pricing.mjs):
 *   1. The mandate's Mandate Products decide the offerings: AR always,
 *      DPP_SUBSCRIPTION when a product has a DPP under way, BATTERY_PASSPORT
 *      when that product is a battery.
 *   2. The opportunity: `opportunityId` if given; else the one the mandate's
 *      lines are already on; else the mandate company's only open (not LOST)
 *      opportunity. Otherwise 409 with the candidates: pass one explicitly.
 *   3. Each offering's value: the mandate's annualFee (AR), else a binding
 *      (ACCEPTED / ACTIVE, in effect today) Client Price Agreement line of the
 *      company, else the price list at the opportunity's tier (else the
 *      company's), less 15% when AR and DPP are both implied.
 *   4. An OpportunityLine per offering is created (linked to the mandate, and
 *      to the stream of the products' category), or the existing one updated:
 *      only arMandate, estimatedValueEur and a missing stream are written,
 *      never stage or probability. Running it twice writes nothing the second
 *      time.
 *
 * `dryRun: true` returns the plan without writing. Responds 200 `{ arMandateId,
 * opportunityId, tier, dryRun, created[], updated[], unchanged[], skipped[] }`;
 * 404 mandate_not_found / opportunity_not_found, 409 ambiguous_opportunity /
 * opportunity_not_found `{ candidates }`.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can read
 * arMandates, mandateProducts, opportunities, companies, offerings,
 * pricePoints, bundleItems, productStreams, clientPriceAgreements,
 * agreementLines and write opportunityLines), OPS_TOKEN.
 */
import { z } from 'zod';

import {
  TwentyApiError,
  configFromEnv,
  createRecord,
  eq,
  findAllRecords,
  findRecords,
  updateRecord,
  type TwentyConfig,
  type TwentyRecord,
} from '../../ops/lib/twenty-api';
import { BINDING_AGREEMENT_STATUSES, isEffective, pickOpportunity, planMandateLines } from '../../shared/agreement-pricing.mjs';
import { CLOSED_OPPORTUNITY_STAGES } from '../../shared/portal-events.mjs';
import { PRODUCT_STREAMS } from '../../shared/streams.mjs';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

export const LinkPayload = z.object({
  arMandateId: z.uuid(),
  opportunityId: z.uuid().optional(),
  dryRun: z.boolean().default(false),
});
export type LinkPayload = z.infer<typeof LinkPayload>;

type Plan = ReturnType<typeof planMandateLines>;
type Written = { id: string | null; offeringCode: string; estimatedValueEur: number | null; priceSource: string };

export type LinkResult = {
  arMandateId: string;
  opportunityId: string;
  tier: string | null;
  dryRun: boolean;
  created: Written[];
  updated: Array<Written & { patch: Record<string, unknown> }>;
  unchanged: Written[];
  skipped: Plan['skipped'];
};

export class LinkError extends Error {
  constructor(
    readonly code: 'mandate_not_found' | 'opportunity_not_found' | 'ambiguous_opportunity',
    readonly status: number,
    readonly detail: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = 'LinkError';
  }
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : null);

/** The products' most common category (else the company's) → its ProductStream id. */
async function streamFor(config: TwentyConfig, products: TwentyRecord[], company: TwentyRecord | null): Promise<string | null> {
  const counts = new Map<string, number>();
  for (const p of products) if (str(p.category)) counts.set(String(p.category), (counts.get(String(p.category)) ?? 0) + 1);
  const category = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? str(company?.productCategory);
  const slug = PRODUCT_STREAMS.find((s) => s.category === category)?.slug;
  if (!slug) return null;
  const [stream] = await findRecords(config, 'productStreams', { filter: eq('slug', slug), limit: 1 });
  return stream?.id ?? null;
}

/** Lines of the company's binding agreements that are in effect today. */
async function bindingAgreementLines(config: TwentyConfig, companyId: string | null, today: string): Promise<TwentyRecord[]> {
  if (!companyId) return [];
  const agreements = (await findAllRecords(config, 'clientPriceAgreements', { filter: eq('clientId', companyId) })).filter(
    (a) => BINDING_AGREEMENT_STATUSES.includes(String(a.status)) && isEffective(str(a.startDate), str(a.endDate), today),
  );
  if (!agreements.length) return [];
  return findAllRecords(config, 'agreementLines', { filter: `agreementId[in]:${JSON.stringify(agreements.map((a) => a.id))}` });
}

export async function linkMandatePricing(config: TwentyConfig, p: LinkPayload, now = new Date()): Promise<LinkResult> {
  const today = now.toISOString().slice(0, 10);
  const [mandate] = await findRecords(config, 'arMandates', { filter: eq('id', p.arMandateId), limit: 1 });
  if (!mandate) throw new LinkError('mandate_not_found', 404);
  const companyId = str(mandate.companyId);

  const [products, mandateLines, companyOpportunities] = await Promise.all([
    findAllRecords(config, 'mandateProducts', { filter: eq('arMandateId', mandate.id) }),
    findAllRecords(config, 'opportunityLines', { filter: eq('arMandateId', mandate.id) }),
    companyId ? findAllRecords(config, 'opportunities', { filter: eq('companyId', companyId) }) : Promise.resolve([]),
  ]);

  const picked = pickOpportunity({ requestedId: p.opportunityId ?? null, mandateLines, companyOpportunities, closedStages: CLOSED_OPPORTUNITY_STAGES });
  if ('error' in picked) throw new LinkError(picked.error, 409, { candidates: picked.candidates });
  const [opportunity] = await findRecords(config, 'opportunities', { filter: eq('id', picked.opportunityId), limit: 1 });
  if (!opportunity) throw new LinkError('opportunity_not_found', 404);

  const [company] = companyId ? await findRecords(config, 'companies', { filter: eq('id', companyId), limit: 1 }) : [];
  const [existingLines, offerings, pricePoints, bundleItems, agreementLines, streamId] = await Promise.all([
    findAllRecords(config, 'opportunityLines', { filter: eq('opportunityId', opportunity.id) }),
    findAllRecords(config, 'offerings'),
    findAllRecords(config, 'pricePoints'),
    findAllRecords(config, 'bundleItems'),
    bindingAgreementLines(config, companyId, today),
    streamFor(config, products, company ?? null),
  ]);
  const tier = str(opportunity.tier) ?? str(company?.tier);

  const plan = planMandateLines({
    mandate,
    products,
    opportunityId: opportunity.id,
    existingLines,
    offerings,
    pricePoints,
    bundleItems,
    agreementLines,
    tier,
    streamId,
    today,
  });

  const summary = ({ offeringCode, estimatedValueEur, priceSource }: Omit<Written, 'id'>) => ({ offeringCode, estimatedValueEur, priceSource });
  const created: Written[] = [];
  for (const c of plan.create) {
    const record = p.dryRun ? null : await createRecord(config, 'opportunityLines', c.data);
    created.push({ id: record?.id ?? null, ...summary(c) });
  }
  const updated: LinkResult['updated'] = [];
  for (const u of plan.update) {
    if (!p.dryRun) await updateRecord(config, 'opportunityLines', u.id, u.patch);
    updated.push({ id: u.id, ...summary(u), patch: u.patch });
  }

  return {
    arMandateId: mandate.id,
    opportunityId: opportunity.id,
    tier,
    dryRun: p.dryRun,
    created,
    updated,
    unchanged: plan.unchanged.map((u) => ({ id: u.id, ...summary(u) })),
    skipped: plan.skipped,
  };
}

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  const parsed = LinkPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    return json(200, await linkMandatePricing(configFromEnv(), parsed.data));
  } catch (error) {
    if (error instanceof LinkError) return json(error.status, { error: error.code, ...error.detail });
    console.error('[link-mandate-pricing]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
