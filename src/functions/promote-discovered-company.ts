/**
 * promote-discovered-company — REST sidecar (F0.3b) Lambda, A2. POST
 * `{ discoveredCompanyId }` with bearer OPS_TOKEN to turn a DiscoveredCompany
 * into a CRM Company.
 *
 *   1. Already promoted (isExportedToCRM with a Company id) → return that id.
 *   2. A CRM Company with the same LinkedIn page or website already exists →
 *      link to it rather than create a second one (`created: false`).
 *   3. Otherwise create the Company: name, website, LinkedIn link, Chinese
 *      name, and the best-scoring product category.
 *   4. Mark the DiscoveredCompany isExportedToCRM with exportedCompanyId.
 *
 * No Person is created: discovery only ever handles company data (A2
 * guardrail a). Responds `{ companyId, created }`.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can write
 * companies / discoveredCompanies), OPS_TOKEN.
 */
import { z } from 'zod';

import { TwentyApiError, configFromEnv, createRecord, eq, findRecords, updateRecord, type TwentyConfig } from '../../ops/lib/twenty-api';
import { CATEGORY_POINTS, companyPageUrl } from '../../shared/lead-discovery.mjs';
import { findCompanyByLinkedin, findCompanyByWebsite } from './lib/discovery';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

export const PromotePayload = z.object({ discoveredCompanyId: z.uuid() });

export type PromoteResult = { companyId: string; created: boolean };

const url = (value: unknown) => (value as { primaryLinkUrl?: string | null } | null | undefined)?.primaryLinkUrl || null;
const link = (value: string) => ({ primaryLinkUrl: value, primaryLinkLabel: '', secondaryLinks: null });

/** The highest-scoring category, for Company.productCategory (a single select). */
const bestCategory = (categories: string[]) =>
  [...categories].sort((a, b) => ((CATEGORY_POINTS as Record<string, number>)[b] ?? 0) - ((CATEGORY_POINTS as Record<string, number>)[a] ?? 0))[0] ?? null;

/** Null if the DiscoveredCompany does not exist. */
export async function promoteDiscoveredCompany(config: TwentyConfig, discoveredCompanyId: string): Promise<PromoteResult | null> {
  const [found] = await findRecords(config, 'discoveredCompanies', { filter: eq('id', discoveredCompanyId), limit: 1 });
  if (!found) return null;
  if (found.isExportedToCRM && typeof found.exportedCompanyId === 'string' && found.exportedCompanyId) {
    return { companyId: found.exportedCompanyId, created: false };
  }

  const linkedinUrl = companyPageUrl(url(found.linkedinUrl));
  const website = url(found.website);
  const existing =
    (linkedinUrl ? await findCompanyByLinkedin(config, linkedinUrl) : null) ??
    (website ? await findCompanyByWebsite(config, website) : null);

  let companyId: string;
  if (existing) {
    companyId = existing.id;
  } else {
    const category = bestCategory((found.productCategories as string[] | null) ?? []);
    const nameZh = typeof found.companyNameZh === 'string' ? found.companyNameZh.trim() : '';
    const company = await createRecord(config, 'companies', {
      name: String(found.companyName ?? '').trim() || linkedinUrl || website || 'Unnamed company',
      ...(website ? { domainName: link(website) } : {}),
      ...(linkedinUrl ? { linkedinLink: link(linkedinUrl) } : {}),
      ...(nameZh ? { nameZh } : {}),
      ...(category ? { productCategory: category } : {}),
    });
    companyId = company.id;
  }

  await updateRecord(config, 'discoveredCompanies', discoveredCompanyId, { isExportedToCRM: true, exportedCompanyId: companyId });
  return { companyId, created: !existing };
}

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  const parsed = PromotePayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const result = await promoteDiscoveredCompany(configFromEnv(), parsed.data.discoveredCompanyId);
    if (!result) return json(404, { error: 'discovered_company_not_found' });
    return json(result.created ? 201 : 200, result);
  } catch (error) {
    console.error('[promote-discovered-company]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
