#!/usr/bin/env node
/**
 * A2: import a CSV of leads as DiscoveredCompanies via the import-leads-csv
 * sidecar function. File upload is not wired, so this parses the file and
 * sends the rows as JSON (up to 500 per import).
 *
 *   LEADS_CSV_PATH=leads.csv node ops/import-leads.mjs [--dry-run] [--name="Canton Fair 2026"]
 *
 * The first row is the header: company name (required), website, LinkedIn,
 * headquarters, province, industry, company size, contact name / title /
 * e-mail, description (the aliases are in shared/lead-import.mjs). Quoted
 * fields, "" escapes and newlines inside quotes are handled. XLSX: save as CSV.
 *
 * Creates a LeadImport (source CSV, status UPLOADED), then calls the sidecar.
 * --dry-run parses and validates the rows; calls nothing.
 *
 * Ends with `{ imported, duplicates, errors }`.
 * Exit codes: 0 ok · 1 config error, unreadable file or failed import.
 * Env: LEADS_CSV_PATH, TWENTY_API_URL, TWENTY_API_KEY (ops/lib/twenty-api.mjs),
 * SIDECAR_URL, OPS_TOKEN (ops/lib/sidecar.mjs).
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { MAX_IMPORT_ROWS, mapImportRow } from '../shared/lead-import.mjs';
import { SidecarError, callSidecar, sidecarFromEnv } from './lib/sidecar.mjs';
import { TwentyApiError, configFromEnv, createRecord, parseArgs } from './lib/twenty-api.mjs';

/** RFC 4180 CSV → array of rows (arrays of strings). */
export function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const text = input.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

/** Header + data rows → `[{ header: value }]`. */
export function csvToObjects(input) {
  const [header = [], ...data] = parseCsv(input);
  return data.map((cells) => Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? '').trim()])));
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const dryRun = flags['dry-run'] === true;
  const path = process.env.LEADS_CSV_PATH;
  if (!path) throw new Error('LEADS_CSV_PATH is not set (the CSV file to import)');
  const rows = csvToObjects(readFileSync(path, 'utf8'));
  if (rows.length === 0) throw new Error(`${path}: no data rows`);
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`${path}: ${rows.length} rows; split it into files of at most ${MAX_IMPORT_ROWS}`);

  const invalid = rows.map((row, i) => [i + 1, mapImportRow(row)]).filter(([, m]) => !m.ok);
  console.log(`${dryRun ? '[dry-run] ' : ''}${basename(path)}: ${rows.length} row(s), ${invalid.length} invalid`);
  for (const [n, m] of invalid.slice(0, 10)) console.log(`  row ${n}: ${m.reason}`);
  if (dryRun) return;

  const twenty = configFromEnv();
  const sidecar = sidecarFromEnv();
  const name = typeof flags.name === 'string' ? flags.name : basename(path).replace(/\.[^.]+$/, '');
  const leadImport = await createRecord(twenty, 'leadImports', { name, fileName: basename(path), source: 'CSV', status: 'UPLOADED', rowCount: rows.length });
  console.log(`LeadImport ${leadImport.id}`);
  const result = await callSidecar(sidecar, 'import-leads-csv', { leadImportId: leadImport.id, rows });
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  const detail = (error instanceof SidecarError || error instanceof TwentyApiError) && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`import-leads: ${error.message}${detail}`);
  process.exit(1);
});
