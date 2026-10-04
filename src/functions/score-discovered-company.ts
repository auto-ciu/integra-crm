/**
 * score-discovered-company — REST sidecar (F0.3b) Lambda, A2. POST
 * `{ discoveredCompanyId }` with bearer OPS_TOKEN to (re-)score one
 * DiscoveredCompany, e.g. after staff fill in its e-mail domains or fix its
 * product categories. apify-webhook scores every company it imports with the
 * same rules (shared/lead-discovery.mjs):
 *
 *   product category up to 40 · website + LinkedIn 10 · e-mail domains 15 ·
 *   size 5/10/15 · headquarters in China 10 · industry match 10
 *
 * Writes DiscoveredCompany.score and scoreBreakdown (markdown); responds
 * `{ score, breakdown }`.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can write
 * discoveredCompanies), OPS_TOKEN.
 */
import { z } from 'zod';

import { TwentyApiError, configFromEnv, eq, findRecords, updateRecord, type TwentyConfig } from '../../ops/lib/twenty-api';
import { breakdownMarkdown, scoreDiscoveredCompany as scoreCompany } from '../../shared/lead-discovery.mjs';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

export const ScorePayload = z.object({ discoveredCompanyId: z.uuid() });

export type DiscoveryScoreBreakdown = ReturnType<typeof scoreCompany>['breakdown'];
export type DiscoveryScoreResult = { score: number; breakdown: DiscoveryScoreBreakdown };

const url = (value: unknown) => (value as { primaryLinkUrl?: string | null } | null | undefined)?.primaryLinkUrl ?? null;
const str = (value: unknown) => (typeof value === 'string' ? value : null);

/** Score one DiscoveredCompany and write the result back; null if it does not exist. */
export async function scoreDiscoveredCompany(config: TwentyConfig, discoveredCompanyId: string): Promise<DiscoveryScoreResult | null> {
  const [company] = await findRecords(config, 'discoveredCompanies', { filter: eq('id', discoveredCompanyId), limit: 1 });
  if (!company) return null;

  const result = scoreCompany({
    productCategories: (company.productCategories as string[] | null) ?? [],
    website: url(company.website),
    linkedinUrl: url(company.linkedinUrl),
    emailDomains: str(company.emailDomains),
    companySize: str(company.companySize),
    headquarters: str(company.headquarters),
    industry: str(company.industry),
  });

  await updateRecord(config, 'discoveredCompanies', discoveredCompanyId, {
    score: result.score,
    scoreBreakdown: { markdown: breakdownMarkdown(result), blocknote: null },
  });
  return { score: result.score, breakdown: result.breakdown };
}

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  const parsed = ScorePayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const result = await scoreDiscoveredCompany(configFromEnv(), parsed.data.discoveredCompanyId);
    if (!result) return json(404, { error: 'discovered_company_not_found' });
    return json(200, result);
  } catch (error) {
    console.error('[score-discovered-company]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
