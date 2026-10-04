/**
 * send-gdpr-art14 — REST sidecar (F0.3b) Lambda stub, A2. POST
 * `{ discoveredCompanyId? }` with bearer OPS_TOKEN. We hold business contact
 * data collected from public sources, so GDPR Art.14 requires telling the
 * people concerned (within a month at the latest). The function finds the
 * DiscoveredCompanies that were promoted to the CRM (isExportedToCRM) and have
 * no notice yet (isGdprArt14Sent = false) — just the one given, if
 * `discoveredCompanyId` is — and for each:
 *
 *   1. builds the notice (shared/lead-import.mjs gdprArt14Notice: who we are,
 *      what we hold, source, legitimate interest, retention, rights, contact);
 *   2. creates a CRM Task "Send GDPR Art.14 notice to <company>" with the
 *      notice as its body, due in 30 days, assigned to the discoverer (the
 *      reviewer, else the importer) and linked to the CRM Company;
 *   3. marks the record isGdprArt14Sent with gdprArt14SentAt.
 *
 * Sending by e-mail (SES) is future work; until then a person sends the text
 * from the Task, so "sent" means "notice issued and tracked".
 * A record is only marked once its Task exists, so a failed run is retried.
 *
 * Responds `{ noticesGenerated, tasksCreated }`.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can write
 * discoveredCompanies, tasks, taskTargets), OPS_TOKEN, and GDPR_CONTACT_EMAIL
 * (the privacy contact printed in the notice).
 */
import { z } from 'zod';

import { TwentyApiError, configFromEnv, createRecord, eq, findAllRecords, findRecords, updateRecord, type TwentyConfig, type TwentyRecord } from '../../ops/lib/twenty-api';
import { gdprArt14Notice } from '../../shared/lead-import.mjs';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

export const GdprPayload = z.object({ discoveredCompanyId: z.uuid().optional() });

export type GdprResult = { noticesGenerated: number; tasksCreated: number };

/** Art.14(3)(a): at the latest within one month of obtaining the data. */
const DUE_DAYS = 30;

/** Who found the lead: its reviewer, else whoever uploaded its import; null if neither is known. */
async function discoverer(config: TwentyConfig, company: TwentyRecord): Promise<string | null> {
  if (typeof company.reviewedById === 'string' && company.reviewedById) return company.reviewedById;
  if (typeof company.importIdId !== 'string' || !company.importIdId) return null;
  const [leadImport] = await findRecords(config, 'leadImports', { filter: eq('id', company.importIdId), limit: 1 });
  return typeof leadImport?.uploadedById === 'string' && leadImport.uploadedById ? leadImport.uploadedById : null;
}

export async function sendGdprArt14(
  config: TwentyConfig,
  discoveredCompanyId: string | undefined,
  env: Record<string, string | undefined> = process.env,
  now = new Date(),
): Promise<GdprResult> {
  const pending = discoveredCompanyId
    ? (await findRecords(config, 'discoveredCompanies', { filter: eq('id', discoveredCompanyId), limit: 1 })).filter((c) => c.isExportedToCRM === true && c.isGdprArt14Sent !== true)
    : await findAllRecords(config, 'discoveredCompanies', { filter: 'isExportedToCRM[eq]:true,isGdprArt14Sent[eq]:false' });

  const contact = env.GDPR_CONTACT_EMAIL?.trim() || '[privacy contact: set GDPR_CONTACT_EMAIL before sending]';
  const result = { noticesGenerated: 0, tasksCreated: 0 };
  const dueAt = new Date(now.getTime() + DUE_DAYS * 24 * 3600 * 1000).toISOString();

  for (const company of pending) {
    const companyName = String(company.companyName ?? '').trim() || 'unnamed company';
    const notice = gdprArt14Notice({ companyName, contactName: String(company.contactName ?? '').trim(), contact });
    result.noticesGenerated += 1;

    const assigneeId = await discoverer(config, company);
    const task = await createRecord(config, 'tasks', {
      title: `Send GDPR Art.14 notice to ${companyName}`,
      bodyV2: { markdown: notice, blocknote: null },
      status: 'TODO',
      dueAt,
      ...(assigneeId ? { assigneeId } : {}),
    });
    result.tasksCreated += 1;

    if (typeof company.exportedCompanyId === 'string' && company.exportedCompanyId) {
      await createRecord(config, 'taskTargets', { taskId: task.id, companyId: company.exportedCompanyId }).catch((e) =>
        console.error('[send-gdpr-art14] could not link the task to the company', task.id, e),
      );
    }
    await updateRecord(config, 'discoveredCompanies', company.id, { isGdprArt14Sent: true, gdprArt14SentAt: now.toISOString() });
  }
  return result;
}

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  const parsed = GdprPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    return json(200, await sendGdprArt14(configFromEnv(), parsed.data.discoveredCompanyId));
  } catch (error) {
    console.error('[send-gdpr-art14]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
