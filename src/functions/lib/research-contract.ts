/**
 * The findings.json contract between research/agent.md and research-ingest.ts.
 * The file is untrusted agent output: validated here before anything is
 * written to the CRM. Keep in step with the "Output contract" in agent.md.
 */
import { z } from 'zod';

import { FINDING_CATEGORIES, FINDING_IMPORTANCES } from '../../../shared/research-prompts.mjs';
import { CURRENCIES } from '../../../shared/public-pricing.mjs';

const values = (rows: Array<{ value: string }>) => rows.map((r) => r.value) as [string, ...string[]];

const url = z.url().refine((u) => !/(^|\.)linkedin\.com$/i.test(new URL(u).hostname), 'linkedin.com is blocked');
const day = z.iso.date().nullish();

export const Finding = z.object({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
  category: z.enum(values(FINDING_CATEGORIES)),
  importance: z.enum(values(FINDING_IMPORTANCES)),
  sourceUrls: z.array(url).min(1).max(20),
  publicationDate: day,
  suggestedOwnerEmail: z.email().nullish(),
});

export const CompetitorEntry = z.object({
  name: z.string().trim().min(1).max(200),
  website: url.nullish(),
  productCategory: z.string().trim().max(100).nullish(),
  description: z.string().trim().max(2000).nullish(),
});

export const PriceObservationEntry = z.object({
  competitor: z.string().trim().min(1).max(200),
  offeringCode: z.string().trim().max(200).nullish(),
  price: z.number().nonnegative().finite(),
  currencyCode: z.enum(values(CURRENCIES)).default('EUR'),
  observedAt: z.iso.date(),
  sourceUrl: url.nullish(),
  notes: z.string().trim().max(2000).nullish(),
});

export const FindingsFile = z.object({
  findings: z.array(Finding).max(200),
  competitors: z.array(CompetitorEntry).max(200).default([]),
  priceObservations: z.array(PriceObservationEntry).max(500).default([]),
});
export type FindingsFile = z.infer<typeof FindingsFile>;
