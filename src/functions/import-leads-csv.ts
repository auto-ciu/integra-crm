/**
 * import-leads-csv — REST sidecar (F0.3b) Lambda, A2. POST
 * `{ leadImportId, rows: [{ companyName, website, linkedinUrl, … }] }` with
 * bearer OPS_TOKEN to import parsed CSV/XLSX rows as DiscoveredCompanies.
 * File upload is not wired yet, so the caller (ops/import-leads.mjs) parses
 * the file and sends the rows as JSON; shared/lead-import.mjs maps the
 * headers (company name, website, LinkedIn, HQ, province, contact …).
 *
 * Per row:
 *   - invalid (no name, person profile, bad website / e-mail) → an error, in
 *     the LeadImport's error log;
 *   - same dedupeKey (LinkedIn page, else a hash of name + headquarters) as an
 *     earlier record, an earlier row, or an A1 record with that LinkedIn page
 *     → a duplicate, not created;
 *   - has a LinkedIn page but the same name + headquarters as an existing
 *     company → created with isDuplicate and reviewStatus DUPLICATE ("likely
 *     duplicate"), left for staff;
 *   - otherwise created, scored with the A2 rules (reviewStatus NEW).
 *
 * The LeadImport gets IMPORTING while it runs, then DONE (or FAILED if the
 * CRM went away) with its counts: importedCount = created and not flagged,
 * duplicateCount = skipped + flagged, errorCount, rowCount = the three.
 * Responds `{ imported, duplicates, errors }`.
 *
 * Env: TWENTY_API_URL, TWENTY_API_KEY (an API key whose role can write
 * leadImports / discoveredCompanies), OPS_TOKEN.
 */
import { z } from 'zod';

import { TwentyApiError, configFromEnv, createRecord, eq, findRecords, updateRecord, type TwentyConfig } from '../../ops/lib/twenty-api';
import { breakdownMarkdown, scoreDiscoveredCompany } from '../../shared/lead-discovery.mjs';
import { MAX_IMPORT_ROWS, dedupeKey, likelySameCompany, mapImportRow } from '../../shared/lead-import.mjs';
import { json, readAuthorisedJson, type HttpEvent, type HttpResult } from './lib/sidecar';

export const ImportPayload = z.object({
  leadImportId: z.uuid(),
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(MAX_IMPORT_ROWS),
});
export type ImportPayload = z.infer<typeof ImportPayload>;

export type ImportResult = { imported: number; duplicates: number; errors: number };

export class ImportError extends Error {
  constructor(readonly code: 'lead_import_not_found' | 'already_imported', readonly status: number) {
    super(code);
    this.name = 'ImportError';
  }
}

const link = (value: string) => ({ primaryLinkUrl: value, primaryLinkLabel: '', secondaryLinks: null });
const linkUrl = (value: unknown) => (value as { primaryLinkUrl?: string | null } | null | undefined)?.primaryLinkUrl ?? '';

type Row = Record<string, string>;

/** An existing record that is this row, by dedupe key or LinkedIn page: skip. */
async function findExact(config: TwentyConfig, key: string, linkedinUrl: string | undefined) {
  const [byKey] = await findRecords(config, 'discoveredCompanies', { filter: eq('dedupeKey', key), limit: 1 });
  if (byKey) return byKey;
  if (!linkedinUrl) return null;
  const [byPage] = await findRecords(config, 'discoveredCompanies', { filter: `linkedinUrl.primaryLinkUrl[eq]:${JSON.stringify(linkedinUrl)}`, limit: 1 });
  return byPage ?? null;
}

/** An existing record with the same name and headquarters. */
async function findLikely(config: TwentyConfig, row: Row) {
  const candidates = await findRecords(config, 'discoveredCompanies', {
    filter: `companyName[ilike]:${JSON.stringify(`%${row.companyName.replace(/[%_]/g, ' ').slice(0, 40)}%`)}`,
    limit: 20,
  });
  return candidates.find((c) => likelySameCompany(row, { companyName: String(c.companyName ?? ''), headquarters: String(c.headquarters ?? '') })) ?? null;
}

async function importRows(config: TwentyConfig, leadImportId: string, rows: unknown[]): Promise<{ result: ImportResult; log: string[] }> {
  const seen = new Set<string>();
  const log: string[] = [];
  const result = { imported: 0, duplicates: 0, errors: 0 };

  for (const [index, raw] of rows.entries()) {
    const label = `Row ${index + 1}`;
    const mapped = mapImportRow(raw);
    if (!mapped.ok) {
      result.errors += 1;
      log.push(`- ${label}: ${mapped.reason}`);
      continue;
    }
    const row: Row = mapped.record;
    const key = dedupeKey(row);
    if (seen.has(key)) {
      result.duplicates += 1;
      log.push(`- ${label}: ${row.companyName} repeats an earlier row`);
      continue;
    }
    seen.add(key);

    try {
      const exact = await findExact(config, key, row.linkedinUrl);
      if (exact) {
        result.duplicates += 1;
        log.push(`- ${label}: ${row.companyName} already imported (${exact.id})`);
        continue;
      }
      const likely = await findLikely(config, row);
      // No LinkedIn page: name + headquarters IS the dedupe key, so it is an exact duplicate.
      if (likely && !row.linkedinUrl) {
        result.duplicates += 1;
        log.push(`- ${label}: ${row.companyName} already imported (${likely.id})`);
        continue;
      }

      const scored = scoreDiscoveredCompany({
        productCategories: [],
        website: row.website ?? null,
        linkedinUrl: row.linkedinUrl ?? null,
        emailDomains: null,
        companySize: row.companySize ?? null,
        headquarters: row.headquarters ?? null,
        industry: row.industry ?? null,
      });
      await createRecord(config, 'discoveredCompanies', {
        importIdId: leadImportId,
        dedupeKey: key,
        companyName: row.companyName,
        ...(row.companyNameZh ? { companyNameZh: row.companyNameZh } : {}),
        ...(row.website ? { website: link(row.website) } : {}),
        ...(row.linkedinUrl ? { linkedinUrl: link(row.linkedinUrl) } : {}),
        industry: row.industry ?? '',
        companySize: row.companySize ?? '',
        headquarters: row.headquarters ?? '',
        ...(row.province ? { province: row.province } : {}),
        ...(row.contactName ? { contactName: row.contactName } : {}),
        ...(row.contactTitle ? { contactTitle: row.contactTitle } : {}),
        ...(row.contactEmail ? { contactEmail: row.contactEmail } : {}),
        ...(row.description ? { description: { markdown: row.description, blocknote: null } } : {}),
        isDuplicate: Boolean(likely),
        reviewStatus: likely ? 'DUPLICATE' : 'NEW',
        score: scored.score,
        scoreBreakdown: { markdown: breakdownMarkdown(scored), blocknote: null },
      });
      if (likely) {
        result.duplicates += 1;
        log.push(`- ${label}: ${row.companyName} imported but flagged, same name and headquarters as ${likely.id}`);
      } else {
        result.imported += 1;
      }
    } catch (error) {
      if (!(error instanceof TwentyApiError)) throw error;
      // One bad row (e.g. a unique-index clash with a concurrent import) must not sink the batch.
      console.error('[import-leads-csv]', label, { message: error.message, body: error.body });
      result.errors += 1;
      log.push(`- ${label}: ${row.companyName} could not be saved (${error.status ?? 'CRM error'})`);
    }
  }
  return { result, log };
}

export async function importLeadsCsv(config: TwentyConfig, payload: ImportPayload, now = new Date()): Promise<ImportResult> {
  const [leadImport] = await findRecords(config, 'leadImports', { filter: eq('id', payload.leadImportId), limit: 1 });
  if (!leadImport) throw new ImportError('lead_import_not_found', 404);
  if (leadImport.status === 'DONE') throw new ImportError('already_imported', 409);

  await updateRecord(config, 'leadImports', payload.leadImportId, { status: 'IMPORTING', startedAt: now.toISOString(), rowCount: payload.rows.length });
  try {
    const { result, log } = await importRows(config, payload.leadImportId, payload.rows);
    await updateRecord(config, 'leadImports', payload.leadImportId, {
      status: 'DONE',
      rowCount: result.imported + result.duplicates + result.errors,
      importedCount: result.imported,
      duplicateCount: result.duplicates,
      errorCount: result.errors,
      completedAt: new Date().toISOString(),
      errorLog: { markdown: log.join('\n'), blocknote: null },
    });
    return result;
  } catch (error) {
    await updateRecord(config, 'leadImports', payload.leadImportId, { status: 'FAILED', completedAt: new Date().toISOString() }).catch((e) =>
      console.error('[import-leads-csv] could not mark the import FAILED', payload.leadImportId, e),
    );
    throw error;
  }
}

export const handler = async (event: HttpEvent): Promise<HttpResult> => {
  const request = readAuthorisedJson(event, process.env.OPS_TOKEN);
  if ('error' in request) return request.error;
  const parsed = ImportPayload.safeParse(request.body);
  if (!parsed.success) {
    return json(400, {
      error: 'invalid_payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  try {
    return json(200, await importLeadsCsv(configFromEnv(), parsed.data));
  } catch (error) {
    if (error instanceof ImportError) return json(error.status, { error: error.code });
    console.error('[import-leads-csv]', error instanceof TwentyApiError ? { message: error.message, body: error.body } : error);
    return json(502, { error: 'crm_unavailable' });
  }
};
