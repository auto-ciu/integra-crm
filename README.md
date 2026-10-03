# Integra CRM — Twenty App (Requirement 4: data model)

[![CI](https://github.com/auto-ciu/integra-crm/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/auto-ciu/integra-crm/actions/workflows/ci.yml)

The Integra flywheel data model as ONE Twenty App package (`@integra/crm-app`),
installed on an unmodified Twenty **v2.41.0** — no fork, no vendoring.

```
├── src/index.ts                     defineApplication (nothing else — see "One entity per file")
├── src/app-role.ts                  defineApplicationRole: the app token's role (read-only)
├── src/ids.ts                       every universalIdentifier this app owns (stable; never reuse)
├── src/standard-ids.ts              Twenty's own ids for Company / Person / Opportunity (+ stage) / WorkspaceMember
├── src/options.ts                   shared select option sets (EN · 中文)
├── src/lib/sdk.ts                   the ONLY import of twenty-sdk/define
├── src/lib/fields.ts                text/select/date/currency/relation constructors
├── src/lib/data.ts                  the ONLY data-API call site for the front components
├── src/lib/theme.ts                 --t-* token styles; brand gold pair as var() fallbacks
├── src/objects/{company,person,opportunity,workspace-member}/*.field.ts   standard-object extensions (defineField)
├── src/objects/*.object.ts          ArMandate, MandateProduct, TrainingEvent, Authority, Enquiry, EnquiryMessage, EnquiryRoutingRule
├── src/views/                       Companies table, Pipeline kanban, Renewals, Fair leads, Enquiries table + Inbox kanban, widgets
├── src/page-layouts/                AR Mandate record page (5 tabs), Enquiry record page (3 tabs), Today (standalone)
├── src/front-components/            RenewalBanner, RenewalCountWidget, PromoteToLeadButton (stub)
├── src/navigation/*.nav.ts          sidebar: Today, AR Mandates, Training Events, Authorities, Enquiries
├── src/logic-functions/             F0.3 spike: health-check (httpRoute), company-created (databaseEvent), daily-heartbeat (cron)
├── src/functions/                   REST sidecar (F0.3b) Lambdas: enquiry-intake, enquiry-triage (stub). Not app entities
├── shared/stages.mjs                the six pipeline stages (views + ops + verify read this)
├── shared/urgency.mjs               renewal maths shared by widgets and the nightly job
├── shared/icp.mjs                   freemail list + e-mail-domain → Company matching
├── ops/lib/twenty-api.{mjs,ts}      REST/metadata client (ops scripts; .ts port for the sidecar)
├── ops/nightly-status.mjs           urgency/status recompute via REST (idempotent, --dry-run)
├── ops/sync-opportunity-stages.mjs  replaces the stock stage options via /metadata
├── docs/logic-function-spike.md     F0.3 findings: what logic functions can do on 2.41, and the decision
└── verify-model.mjs                 dependency-free static check (npm run verify)
```

## One entity per file

twenty-sdk's manifest builder (`twenty dev`, `twenty dev:build`) does not
follow imports. It scans every `.ts`/`.tsx` file and registers the file's
`export default defineX({...})` — the call itself, not an identifier, and
only one per file. Named exports are silently ignored. Page-layout tabs and
widgets are therefore nested plain objects inside `definePageLayout`, and
`verify-model.mjs` (check 9) fails if any file breaks the rule.

## Commands

```bash
npm ci                            # twenty-sdk / twenty-client-sdk pinned to ~2.41.0
npm run verify                    # static model check — no network, no build
npm run typecheck                 # tsc against the SDK's types
npm run build                     # twenty dev:build: build the manifest offline (.twenty/output)
npm run dev                       # twenty dev: sync the app into a local Twenty (needs a remote)
npm run plan                      # twenty plan: preview metadata changes on the remote
npm run deploy                    # twenty apply: apply them

TWENTY_API_URL=http://localhost:3001 TWENTY_API_KEY=… npm run stages:dry   # then stages:sync
TWENTY_API_URL=http://localhost:3001 TWENTY_API_KEY=… npm run nightly:dry  # then nightly (cron)
```

## Model

| Object | Kind | Fields added |
| --- | --- | --- |
| Company | extend | nameZh, wechatId, province, productCategory, exportRevenueBand, tier (+ arMandates, trainingEvents, enquiries inverses) |
| Person | extend | wechatId, roleTitle, language, preferredChannel, lastWeChatContact, leadStatus (+ enquiries inverse) |
| Opportunity | extend | productLine, tier (+ enquiries inverse); stage set replaced by `ops/sync-opportunity-stages.mjs` |
| WorkspaceMember | extend | enquiryRoutingRules inverse (unverified on a live server, see below) |
| AR Mandate | new | company→, status, startDate, endDate, renewalDate, docusignEnvelopeId, annualFee (EUR), signatory, urgency (computed), documents (files), products |
| Mandate Product | new | arMandate→, productName, category, dppStatus |
| Training Event | new | title (`name`), date, channel, attendeeCount, company→ |
| Authority | new | name, authorityType, country, notes |
| Enquiry | new | reference (unique, label), intakeId (unique), status, priority, category, subject, language, source, sourcePage, utmSource/Medium/Campaign, spamCheck, triageNotes, closedAt, relatedCompany→, relatedPerson→, relatedOpportunity→, messages |
| Enquiry Message | new | name, enquiry→, direction, body, senderEmail, sentAt, isAutoReply |
| Enquiry Routing Rule | new | name, category, language, assignTo→WorkspaceMember, isActive, priority |

Urgency windows (days to `renewalDate`): **None** > 180 · **Watch** 90–180 ·
**Due** < 90 · **Overdue** < 0. `Active` flips to `Expiring` inside 90 days.
Key dates live in `shared/urgency.mjs` (Canton Fair 15 Oct 2026 — edit there;
Battery DPP mandate 18 Feb 2027).

## e2e contracts (crm/e2e/journey.spec.ts)

| Contract | Where |
| --- | --- |
| `data-testid="renewal-banner"` on the AR Mandate record page | `RenewalBanner.tsx`, Overview tab widget |
| `data-testid="renewal-count-widget"` on Today | `RenewalCountWidget.tsx`, Today layout |
| Company labels findable as `WeChat ID`, `Province`, `Product category`, `Tier` | `src/objects/company/*.field.ts` (`EN · 中文`, English first) |
| Kanban view found by `/pipeline\|by stage\|kanban/i` | view named **Pipeline** |
| Sidebar `^today$`, `^ar mandates?$` | `src/navigation/*.nav.ts`, object label `AR Mandates` |

## Label convention and its exceptions

Field labels are `EN · 中文` (English first so table headers truncate to the
English). The metadata API's `label` is a free string with no documented limit,
and `verify-model.mjs` caps Company labels at 63 characters as a guard. Three
things stay **English-only on purpose** because the e2e matchers are anchored:
the object labels `AR Mandate(s)`, the nav item `Today`, and the view name
`Pipeline`. `DocuSign envelope ID` has no useful Chinese form.

## What was verified, and what was not

Verified against the installed twenty-sdk / twenty-client-sdk **2.41.0**:

- `npm run typecheck` is clean: export names, field/relation manifests
  (`universalSettings`, not `settings`), widget configurations, view and
  navigation shapes, `defineFrontComponent` (from `twenty-sdk/define`) and
  `useRecordId` (from `twenty-sdk/front-component`).
- `npm run build` (`twenty dev:build`) succeeds with no warnings and the
  manifest holds every entity: 7 objects, 20 standard-object fields, 11 views,
  3 front components, 3 page layouts, 5 navigation items, 3 logic functions,
  1 role.
- `src/standard-ids.ts` matches the SDK's `STANDARD_OBJECT` constants.

**Not** verified — these need a running Twenty (`npm run dev` against
`crm/e2e`'s instance, then the e2e journey with `E2E_REQUIRE_DATA_MODEL=1`):

1. `src/lib/data.ts` queries (`arMandate`, `arMandates` with
   `edges.node`) against the generated client — the published
   `CoreApiClient` is a stub typed `any` until `twenty dev` regenerates it.
2. The FILES widget takes no field reference in 2.41, so whether it lists the
   `documents` field or the record's attachments is unconfirmed.
3. The "Products covered" and "Renewals due" widgets use `RECORD_TABLE` with a
   `viewUniversalIdentifier` (the `VIEW` widget carries no view id in 2.41).
   Whether the record-page table is scoped to the current mandate is
   unconfirmed.
4. E1 enquiries:
   - The Enquiry record page's Messages table (`RECORD_TABLE`) has the same
     scoping question as item 3.
   - `EnquiryRoutingRule.assignTo` is a relation to WorkspaceMember, which
     needs an inverse field on that system object. If `twenty dev` rejects
     it, delete `src/objects/workspace-member/` and use a TEXT `assigneeEmail`
     instead (F0.4).
   - The Enquiries table's `createdAt` column uses the SDK's derived
     system-field id (`views/columns.ts → systemFieldId`).
   - `reference` and `intakeId` rely on `isUnique` on TEXT fields.
5. Logic functions run on the server only when `LOGIC_FUNCTION_TYPE` is
   `LOCAL` or `LAMBDA`. Self-hosted production defaults to `DISABLED`. Crons
   also need cron registration on the worker. See
   `docs/logic-function-spike.md`.

Note for the e2e: the spec's sample values `productCategory: 'IVD'` and
`tier: 'Tier 2'` are not options of the selects specified for this model
(Battery — Li-ion … / Beginner … Boss); `setField` will type them and press
Enter. If the select rejects free text, update the spec's sample values.
