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
├── src/objects/*.object.ts          ArMandate, MandateProduct, TrainingEvent, Authority, Enquiry, EnquiryMessage, EnquiryRoutingRule,
│                                    ProductStream, StreamUpdate, StreamDocument, StreamContact, FairLead,
│                                    Offering, PricePoint, BundleItem, PricingPublication, ReplyTemplate, LeadDiscoveryRun, DiscoveredCompany,
│                                    TrainingRegistration, CustomerEvent (C3), ResearchBrief (D1-D2)
├── src/views/                       Companies table, Pipeline kanban, Renewals, Fair leads, Enquiries table + Inbox kanban,
│                                    Product Streams table, Offerings, Price Points, Bundle Items + Pricing Publications tables, Reply Templates table,
│                                    Lead Discovery + Discovered Companies tables, Training Registrations table, widgets
├── src/page-layouts/                AR Mandate record page (5 tabs), Enquiry record page (3 tabs), Product Stream record page (4 tabs),
│                                    Offering record page (3 tabs), Training Event record page (2 tabs),
│                                    Research Brief record page (Overview / Raw Result), Today (standalone)
├── src/front-components/            RenewalBanner, RenewalCountWidget, PromoteToLeadButton (stub), PricingDisplay (stub),
│                                    RegisterForTrainingButton (stub)
├── src/navigation/*.nav.ts          sidebar: Today, AR Mandates, Training Events, Authorities, Enquiries, Product Streams, Pricing,
│                                    Lead Discovery, Portal Events, Market Research
├── src/logic-functions/             F0.3 spike: health-check (httpRoute), company-created (databaseEvent), daily-heartbeat (cron)
├── src/functions/                   REST sidecar (F0.3b) Lambdas: enquiry-intake, enquiry-triage (stub), fair-lead-intake,
│                                    score-fair-lead (A1 stub), send-auto-reply (E2), generate-stream-digest (B2),
│                                    renewals-check, send-renewal-notifications (stub), run-linkedin-discovery, apify-webhook,
│                                    score-discovered-company, promote-discovered-company (A2), register-for-training (X5),
│                                    sync-pricing-to-stripe + stripe-webhook (C2), sync-portal-event (C3), research-scheduler + research-ingest (D1-D2, Claude Managed Agents);
│                                    lib/sidecar.ts shared HTTP + CRM helpers, lib/discovery.ts Apify client, lib/stripe.ts Stripe client. Not app entities
├── shared/stages.mjs                the six pipeline stages (views + ops + verify read this)
├── shared/urgency.mjs               renewal maths shared by widgets and renewals-check (planMandate)
├── shared/reply-templates.mjs       E2: the ten seed templates, template choice (fallback order) and rendering
├── shared/digest.mjs                B2: digest model, prices and the $10/session cost cap
├── shared/icp.mjs                   freemail list + e-mail-domain → Company matching
├── shared/streams.mjs               the nine product streams, one per PRODUCT_CATEGORY (seed + verify read this)
├── shared/scoring.mjs               fair-lead score rules (A1 stub; score-fair-lead + verify read this)
├── shared/public-pricing.mjs        C1 pricing: option sets, D3 display rules, canonical offerings, PublicPricingV1 schema + pricing.json transform
├── shared/lead-discovery.mjs        A2: Apify actor pin, cost estimate + caps, guardrails, item mapping, discovery score rules
├── shared/stripe-sync.mjs           C2: CRM pricing → Stripe product/price mapping, sync plan, webhook signature check
├── shared/portal-events.mjs         C3: customer event types/sources, which events open a pipeline Opportunity
├── shared/research-prompts.mjs      D1-D2: one prompt per product category, depth/status options, prompt builder
├── shared/training.mjs              X5: the three seed training events, event-passed + registration rules
├── ops/lib/twenty-api.{mjs,ts}      REST/metadata client (ops scripts; .ts port for the sidecar)
├── ops/lib/sidecar.mjs              client for the ops-invoked sidecar functions (SIDECAR_URL, OPS_TOKEN)
├── ops/nightly-status.mjs           CLI over renewals-check: urgency/status recompute (idempotent, --dry-run)
├── ops/seed-reply-templates.mjs     creates missing ReplyTemplate records from shared/reply-templates.mjs (--dry-run)
├── ops/generate-all-digests.mjs     B2: one AI digest per active ProductStream via generate-stream-digest (weekly, --dry-run)
├── ops/sync-opportunity-stages.mjs  replaces the stock stage options via /metadata
├── ops/seed-product-streams.mjs     creates missing ProductStream records from shared/streams.mjs (idempotent, --dry-run)
├── ops/seed-stream-stages.mjs       B2: the standard 5 StreamStages per ProductStream (idempotent, --dry-run)
├── ops/seed-pricing.mjs             creates missing offerings, price points + bundle items from shared/public-pricing.mjs
├── ops/publish-pricing.mjs          live pricing → validated pricing.json for the website, records a PricingPublication (.github/workflows/publish-pricing.yml)
├── ops/discover-leads.mjs           A2: start an Apify LinkedIn company run via run-linkedin-discovery (--dry-run, --wait)
├── ops/seed-training-events.mjs     creates missing TrainingEvent records from shared/training.mjs (--dry-run)
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
SIDECAR_URL=https://… OPS_TOKEN=… npm run nightly:dry                    # then nightly (cron)
TWENTY_API_URL=http://localhost:3001 TWENTY_API_KEY=… npm run streams:dry  # then streams:seed
TWENTY_API_URL=http://localhost:3001 TWENTY_API_KEY=… npm run pricing:dry  # then pricing:seed
TWENTY_API_URL=http://localhost:3001 TWENTY_API_KEY=… npm run pricing:publish  # writes ./pricing.json
TWENTY_API_URL=http://localhost:3001 TWENTY_API_KEY=… npm run replies:dry  # then replies:seed
TWENTY_API_URL=… TWENTY_API_KEY=… SIDECAR_URL=… OPS_TOKEN=… npm run digests:dry  # then digests (weekly cron)
TWENTY_API_URL=http://localhost:3001 TWENTY_API_KEY=… npm run training:dry  # then training:seed
TWENTY_API_URL=… TWENTY_API_KEY=… STRIPE_SECRET_KEY=sk_test_… npm run stripe:dry   # preview; then SIDECAR_URL=… OPS_TOKEN=… npm run stripe:sync
TWENTY_API_URL=http://localhost:3001 TWENTY_API_KEY=… npm run research:dry  # then research:seed
npm run discover:dry -- --config=leads.json                                # cost + query preview, no network
SIDECAR_URL=… OPS_TOKEN=… APIFY_WEBHOOK_TOKEN=… npm run discover -- --config=leads.json --wait
```

## Model

| Object | Kind | Fields added |
| --- | --- | --- |
| Company | extend | nameZh, wechatId, province, productCategory, exportRevenueBand, tier (+ arMandates, trainingEvents, enquiries, fairLeads, trainingRegistrations inverses) |
| Person | extend | wechatId, roleTitle, language, preferredChannel, lastWeChatContact, leadStatus (+ enquiries, fairLeads, streamContacts, trainingRegistrations inverses) |
| Opportunity | extend | productLine, tier, leadSource (fair name, text) (+ enquiries inverse); stage set replaced by `ops/sync-opportunity-stages.mjs` |
| WorkspaceMember | extend | enquiryRoutingRules inverse (unverified on a live server, see below) |
| AR Mandate | new | company→, status, startDate, endDate, renewalDate, docusignEnvelopeId, annualFee (EUR), signatory, urgency (computed), documents (files), products |
| Mandate Product | new | arMandate→, productName, category, dppStatus |
| Training Event | new | title (`name`), date, channel, attendeeCount, company→, language, location, registrations |
| Training Registration | new | name (event — person), trainingEvent→, person→, company→, status, registrationDate, confirmationSentAt, notes, dietaryRequirements, certificateIssued, certificateUrl |
| Authority | new | name, authorityType, country, notes |
| Enquiry | new | reference (unique, label), intakeId (unique), status, priority, category, subject, language, source, sourcePage, utmSource/Medium/Campaign, spamCheck, triageNotes, closedAt, relatedCompany→, relatedPerson→, relatedOpportunity→, messages |
| Enquiry Message | new | name, enquiry→, direction, body, senderEmail, sentAt, isAutoReply |
| Enquiry Routing Rule | new | name, category, language, assignTo→WorkspaceMember, isActive, priority |
| Product Stream | new | name, slug (unique), description, icon, sortOrder, isActive, activeUpdateCount + lastUpdateAt (denormalised, not yet computed), updates, documents, contacts |
| Stream Update | new | title (`name`), stream→, body, updateType, publishedAt, sourceUrl |
| Stream Document | new | title (`name`), stream→, file, version, effectiveDate, documentType |
| Stream Stage | new | name, stream→, stageName, order, isDefault, description |
| Opportunity Line | new | name, opportunity→, stream→, stage→, offering→, estimatedValueEur, probability, expectedCloseDate, notes, isActive |
| Stream Contact | new | name, stream→, person→, role, notes |
| Fair Lead | new | scanId (unique, label), person→, company→, companyName, source, productInterest (multi), notes, businessCardImage, followUpStatus, capturedAt, score, scoreBreakdown, scoredAt |
| Offering | new | name, offeringCode (unique), productCategory, strategyType, displayFormat, fromPrefix, hasOptionalExtras, isActive, description, features (rich text), validFrom, validUntil, sortOrder, pricePoints, bundleItems, componentOf |
| Price Point | new | name, correlationId (unique), offering→, tier, annualFeeEur, setupFeeEur, currencyCode, isHighlighted, isOnRequest, isLegacy, sortOrder, description |
| Bundle Item | new | name, bundle→ (a BUNDLE offering), component→ (a non-BUNDLE offering), included, sortOrder |
| Pricing Publication | new | name, publishedAt, version, publishedBy→ (workspace member), commitSha, isLive, notes |
| Reply Template | new | name, category (ENQUIRY_CATEGORY + ALL), language (EN/ZH/ALL), subject, body, isActive, sortOrder |
| Lead Discovery Run | new | name, status, source, query (JSON + actor build), resultsCount, resultsNew, costUsd, runId (unique, Apify), startedAt, completedAt, errorMessage, discoveredCompanies |
| Discovered Company | new | discoveryRun→, companyName (label), companyNameZh, website, linkedinUrl, industry, companySize, headquarters, productCategories (multi), description, emailDomains, isExportedToCRM, exportedCompanyId, isDuplicate, score, scoreBreakdown |

Urgency windows (days to `renewalDate`): **None** > 180 · **Watch** 90–180 ·
**Due** < 90 · **Overdue** < 0. `Active` flips to `Expiring` inside 90 days,
and `Expiring` back to `Active` once the renewal date is extended past them.
Only live mandates (Active / Expiring) are checked.
Key dates live in `shared/urgency.mjs` (Canton Fair 15 Oct 2026 — edit there;
Battery DPP mandate 18 Feb 2027).

Pricing (C1): an Offering says HOW a product is sold; its Price Points hold
the EUR prices, and a BUNDLE offering lists its components as Bundle Items.
`displayFormat` controls the website layout (D3 defaults: FLAT → price card,
TIERED → tier table, BUNDLE → bundle comparison, PER_SEAT → seat pricing,
ADD_ON → add-on list, QUOTE_ONLY → contact CTA, CUSTOM → hidden). D3 also
makes `fromPrefix` ("from €…") true for every ADD_ON and any offering with
`hasOptionalExtras`. `npm run pricing:publish` builds `pricing.json`
(PublicPricingV1, validated before it is written) with only live offerings and
public fields; legacy price points are skipped, and on-request price points
and every price point of a contact-CTA / hidden / quote-only offering carry
`annualFeeEur: null`. Each run records a Pricing Publication (`--dry-run` skips
it). The file goes to integrascientific/integra-scientific by hand, since that
repo is under another GitHub account. The "Publish pricing" workflow uploads it
as an artifact; the steps are in `ops/publish-pricing.mjs`.

LinkedIn lead discovery (A2): `npm run discover` asks the
`run-linkedin-discovery` sidecar to start Apify's `harvestapi/linkedin-company`
(build pinned in `shared/lead-discovery.mjs`) for a list of company names
and/or LinkedIn company URLs. Apify's webhook (or `--wait`) then calls
`apify-webhook`, which imports one Discovered Company per company page that
has a website, scores it, and flags pages already found by an earlier run or
already on a CRM Company. `promote-discovered-company` turns one into a CRM
Company. The plan's guardrails are code: company-page actor only (a person's
`/in/` URL is refused on the way in and dropped on the way out), no cookies,
the actor build and run on every record, `APIFY_ENABLED=true` or nothing runs,
and a per-run spend limit (worst case at $4/1k companies, max $5 per run)
that Apify also enforces as `maxTotalChargeUsd`. Keep a monthly cap in the
Apify console too. `emailDomains` is not filled from LinkedIn; staff (or the
later website enrichment) add it, then re-score.

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
  manifest holds every entity: 18 objects, 26 standard-object fields, 26 views,
  5 front components, 6 page layouts, 8 navigation items, 3 logic functions,
  1 role, 2 application variables.
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
5. B1 / A1 (fair capture and streams):
   - The Product Stream record page's three tables (`RECORD_TABLE`) have the
     same scoping question as item 3.
   - `fair-lead-intake` writes a partial `phones` composite
     (`{ primaryPhoneNumber }`); whether REST accepts it without a country
     code is unconfirmed.
   - `StreamUpdate.updateType` is not called `type`, which Twenty reserves.
6. C1 pricing:
   - The Offering record page's Price Points and Bundle Items tables
     (`RECORD_TABLE`) have the same scoping question as item 3.
   - `fetchOffering` in `src/lib/data.ts` (PricingDisplay preview) has
     the same generated-client caveat as item 1.
   - `PricePoint.currencyCode` is not called `currency`, which Twenty reserves
     (like `type`). `pricing.json` still calls it `currency`.
   - The "Pricing" sidebar item is a `VIEW` item named "Pricing", so the label
     is "Pricing" rather than the object's plural. Whether the sidebar shows
     `name` for VIEW items is unconfirmed.
7. Wave 2 (E2 / B2 / renewals):
   - `renewals-check` links its Notes to the mandate with a `noteTargets`
     record keyed `arMandateId`. That assumes Twenty adds a noteTarget
     relation for app objects as it does for custom ones. A failed note is
     logged and counted (`noteErrors`, nightly exit 1); the urgency/status
     write has already happened.
   - The sidecar functions are routed at `<SIDECAR_URL>/<function-name>`
     behind bearer `OPS_TOKEN`; the API Gateway routes are not deployed yet.
   - `generate-stream-digest` has no web search: the model answers from its
     own knowledge, so "the last 30 days" may be thin. The prompt tells it to
     say so and not invent; every update is footnoted as unverified. Live,
     cited research is Feature D.
   - `send-auto-reply` records the reply (OUTBOUND, isAutoReply, sentAt
     empty) but sends nothing: `sent` is false until SES is wired.
8. Wave 3 (A2 / X5):
   - Apify calls: the run, webhook and dataset endpoints and the item shape
     follow Apify's API docs and the actor's published output example (build
     0.0.44); no live Apify run has been made. `apify-webhook` reads only the
     run id from the payload and re-reads status, cost and results from
     Apify.
   - `apify-webhook` needs its own route and bearer (`APIFY_WEBHOOK_TOKEN`,
     sent by Apify through the webhook's headers template). Set
     `APIFY_WEBHOOK_URL` on `run-linkedin-discovery` once that route exists;
     until then use `discover-leads --wait`.
   - DiscoveredCompany de-duplication filters on
     `linkedinUrl.primaryLinkUrl[eq]` (REST filter on a LINKS sub-field).
   - The Training Event record page's Registrations table (`RECORD_TABLE`)
     has the same scoping question as item 3.
   - RegisterForTrainingButton calls the sidecar from the browser:
     `SIDECAR_URL` and `REGISTRATION_TOKEN` are app variables (readable by
     every CRM user, hence a register-only token), and API Gateway's CORS
     settings must allow the Twenty origin. Whether `fetch` is allowed from
     the front-component sandbox is unconfirmed. An authenticated
     logic-function route is the better home once logic functions run.
   - The `trainingEvent` / `people` / `trainingRegistrations` queries in
     `src/lib/data.ts` have the same generated-client caveat as item 1.
9. Wave 3 (C2 / C3 / D1-D2):
   - `sync-pricing-to-stripe` and `stripe-webhook` use Stripe's REST API with
     plain `fetch` (no `stripe` package) and have not run against Stripe: the
     calls follow Stripe's API docs and were exercised against an in-memory
     fake only. Run `npm run stripe:sync` with a `sk_test_` key first. Products
     are keyed by `id = offering.offeringCode`, prices by `lookup_key =
     pricePoint.correlationId`; a changed fee makes a new price that takes the
     lookup key and archives the old one (Stripe cannot edit an amount).
     Nothing is deleted. Contact-CTA / hidden / quote-only and out-of-window
     offerings get an inactive product and no prices; their price points count
     as skipped, as do legacy, on-request and PER_SEAT ones (seats are bought
     once, so a yearly price would be wrong). Products used to be keyed by
     the old strategy `correlationId` (`dsp-2026`, …): a first sync after the
     rewrite creates new products and moves each lookup key to the new product.
   - `stripe-webhook` needs its own API Gateway route, with no bearer: Stripe's
     signature is the authentication (`STRIPE_WEBHOOK_SECRET`). It only logs
     `price.created` / `price.updated` / `checkout.session.completed`.
   - `sync-portal-event` authenticates with its own `PORTAL_TOKEN` (the portal
     holds it), not `OPS_TOKEN`. A PURCHASE / RENEWAL finds the customer's open
     Opportunity (by Company, else Person, else name) and moves it to
     Subscribed, or creates one; a LOST opportunity is not reopened. A customer
     that matches no Person or Company still gets an Opportunity, named after
     them and linked to nobody. The portal-side caller is not written.
   - Research (D1-D2) runs on Claude Managed Agents (beta, header pinned in
     `shared/research-agent.mjs`). `research-scheduler` starts a session
     (`POST /v1/sessions`, `user.define_outcome`, $10 budget) for each
     ResearchBrief with `nextRunAt` due; `research-ingest` (every 15 min)
     reads `findings.json` back, validates it with zod and creates findings,
     Tasks for HIGH ones, competitors and price observations. The agent
     (`research/agent.md`) has no CRM credentials. Not yet done: creating the
     agent and environment (`agentId` is set by hand), the cron/API Gateway
     wiring, and nothing has run against the live API.
     Env: `ANTHROPIC_API_KEY`, `RESEARCH_ENVIRONMENT_ID`, optional
     `RESEARCH_DEFAULT_ASSIGNEE_ID`.
10. Logic functions run on the server only when `LOGIC_FUNCTION_TYPE` is
   `LOCAL` or `LAMBDA`. Self-hosted production defaults to `DISABLED`. Crons
   also need cron registration on the worker. See
   `docs/logic-function-spike.md`.

Note for the e2e: the spec's sample values `productCategory: 'IVD'` and
`tier: 'Tier 2'` are not options of the selects specified for this model
(Battery — Li-ion … / Beginner … Boss); `setField` will type them and press
Enter. If the select rejects free text, update the spec's sample values.
