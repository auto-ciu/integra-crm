#!/usr/bin/env node
/**
 * C2 QuoteBuilder: a quote payload (JSON, ready for the PDF renderer) from a
 * Client Price Agreement or an Opportunity.
 *
 *   node ops/build-quote.mjs --agreement=<id | CPA-2026-001> [--out=quote.json]
 *   node ops/build-quote.mjs --opportunity=<id> [--out=quote.json]
 *   node ops/build-quote.mjs <id | agreement code>      (an agreement if one matches, else an opportunity)
 *
 * Agreement: its lines as agreed (agreedPriceEur × quantity, or the standard
 * price less discountPercent); lines that already ended are left out; valid
 * until the agreement's end date.
 *
 * Opportunity: one line per active OpportunityLine with an offering, at the
 * offering's price point for the opportunity's tier (else the company's; an
 * offering with a single price point needs no tier), with the AR + DPP bundle
 * discount (15%, computed, never stored) when both are on it; valid 30 days.
 *
 * Both: list price, discount and rationale, unit price, quantity, setup fees,
 * totals, and `hasOnRequestItems` when something has no price. The maths is
 * shared/agreement-pricing.mjs (quoteFromAgreement / quoteFromOpportunity).
 * Writes the JSON to --out, or to stdout; warnings go to stderr. Read-only.
 *
 * Exit codes: 0 ok · 1 config error or nothing found.
 * Env: TWENTY_API_URL, TWENTY_API_KEY (read access is enough).
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { quoteFromAgreement, quoteFromOpportunity } from '../shared/agreement-pricing.mjs';
import { TwentyApiError, configFromEnv, eq, findAllRecords, findRecords, parseArgs } from './lib/twenty-api.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const one = async (config, namePlural, filter) => (await findRecords(config, namePlural, { filter, limit: 1 }))[0] ?? null;
const byIdOrNull = (config, namePlural, id) => (id ? one(config, namePlural, eq('id', id)) : Promise.resolve(null));

async function findAgreement(config, key) {
  if (UUID.test(key)) return one(config, 'clientPriceAgreements', eq('id', key));
  return one(config, 'clientPriceAgreements', eq('agreementCode', key));
}

async function priceList(config) {
  const [offerings, pricePoints, bundleItems] = await Promise.all([
    findAllRecords(config, 'offerings'),
    findAllRecords(config, 'pricePoints'),
    findAllRecords(config, 'bundleItems'),
  ]);
  return { offerings, pricePoints, bundleItems };
}

async function agreementQuote(config, agreement) {
  const [lines, list, company, contact] = await Promise.all([
    findAllRecords(config, 'agreementLines', { filter: eq('agreementId', agreement.id) }),
    priceList(config),
    byIdOrNull(config, 'companies', agreement.clientId),
    byIdOrNull(config, 'people', agreement.contactId),
  ]);
  return quoteFromAgreement({ agreement, lines, ...list, company, contact });
}

async function opportunityQuote(config, opportunity) {
  const [opportunityLines, list, company, contact] = await Promise.all([
    findAllRecords(config, 'opportunityLines', { filter: eq('opportunityId', opportunity.id) }),
    priceList(config),
    byIdOrNull(config, 'companies', opportunity.companyId),
    byIdOrNull(config, 'people', opportunity.pointOfContactId),
  ]);
  return quoteFromOpportunity({ opportunity, opportunityLines, ...list, company, contact });
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const positional = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const agreementKey = typeof flags.agreement === 'string' ? flags.agreement : null;
  const opportunityId = typeof flags.opportunity === 'string' ? flags.opportunity : null;
  if (!agreementKey && !opportunityId && !positional) {
    throw new Error('usage: build-quote.mjs --agreement=<id|code> | --opportunity=<id> | <id|code> [--out=quote.json]');
  }
  const config = configFromEnv();

  let quote;
  if (agreementKey || (positional && !opportunityId)) {
    const agreement = await findAgreement(config, agreementKey ?? positional);
    if (agreement) quote = await agreementQuote(config, agreement);
    else if (agreementKey) throw new Error(`no client price agreement ${agreementKey}`);
  }
  if (!quote) {
    const id = opportunityId ?? positional;
    const opportunity = UUID.test(id) ? await one(config, 'opportunities', eq('id', id)) : null;
    if (!opportunity) throw new Error(`no ${opportunityId ? 'opportunity' : 'client price agreement or opportunity'} ${id}`);
    quote = await opportunityQuote(config, opportunity);
  }

  for (const w of quote.warnings) console.error(`warning: ${w}`);
  const text = `${JSON.stringify(quote, null, 2)}\n`;
  if (typeof flags.out === 'string') {
    const out = resolve(flags.out);
    writeFileSync(out, text);
    const t = quote.totals;
    console.error(`wrote ${out}: ${quote.quoteNumber}, ${quote.lines.length} line(s), total €${t.totalEur.toFixed(2)}${t.hasOnRequestItems ? ' + items on request' : ''}`);
  } else {
    process.stdout.write(text);
  }
}

main().catch((error) => {
  const detail = error instanceof TwentyApiError && error.body ? `\n${JSON.stringify(error.body, null, 2)}` : '';
  console.error(`build-quote: ${error.message}${detail}`);
  process.exit(1);
});
