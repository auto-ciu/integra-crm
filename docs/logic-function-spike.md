# F0.3: Twenty logic functions on v2.41 (spike)

Date: 3 Oct 2026. Checked against `twenty-sdk` **2.41.0** and `twenty-client-sdk` 2.41.0, as pinned in `package-lock.json`.

## Verdict

**Use logic functions as the primary host for CRM glue. Keep the REST sidecar (F0.3b) ready as the fallback.**

| Question | Answer | How we know |
| --- | --- | --- |
| Does `twenty-sdk` 2.41 export `defineLogicFunction`? | **Yes**, from `twenty-sdk/define` | Type declarations and runtime export; `npm run typecheck` |
| Does the manifest builder register them? | **Yes.** It bundles each one to about 14 KB of `.mjs` | `npm run build` gives `logicFunctions: 3` in `.twenty/output/manifest.json` |
| Do the built handlers run? | **Yes**, outside Twenty | Imported `.twenty/output/src/logic-functions/*.mjs` in Node 22 and called `default.config.handler` |
| Do they run **on our server**? | **Not tested** (no Twenty instance or Docker in the spike environment) | See "Server-side prerequisites" below |

The SDK side is complete and stable enough to build on. Server-side behaviour is not proven. Self-hosted production Twenty ships with logic functions **disabled**, and our worker has cron registration turned off. So E1 does not depend on it yet. The intake runs as a REST sidecar (`src/functions/`), which works whatever the server config. Once the checks in the last section pass on the dev workspace, intake can move into a logic function. No data-model change is needed, because both paths write the same records through the API.

## API surface (2.41.0)

```ts
import { defineLogicFunction, HTTPMethod } from 'twenty-sdk/define';     // via src/lib/sdk.ts
import type {
  RoutePayload,               // httpRoute event (AWS HTTP API v2 shape)
  DatabaseEventPayload,       // databaseEvent event (metadata + ObjectRecord*Event)
  DatabaseEventBatchPayload,  // when batchMode: true
  ObjectRecordCreateEvent, ObjectRecordUpdateEvent, /* …Delete/Destroy/Restore/Upsert */
  CronPayload,                // Record<string, never>
  LogicFunctionExecutionContext,
} from 'twenty-sdk/logic-function';
// Runtime helpers, also from 'twenty-sdk/logic-function':
//   Response, RetryableLogicFunctionError, enqueueJobs, getJobs, kv,
//   runAgent, createTimelineActivity, ingestMessages, connections, message channels.
// Data access inside a handler: CoreApiClient / MetadataApiClient / RestApiClient
// from 'twenty-client-sdk' (Twenty provides these at runtime).
```

```ts
type LogicFunctionHandler<P = any> =
  (payload: P, context: LogicFunctionExecutionContext) => any | Promise<any>;

type LogicFunctionExecutionContext = {
  retryCount: number; maxRetries: number;
  workspaceId: string; userWorkspaceId: string | null; workspaceMemberId: string | null;
};

defineLogicFunction({
  universalIdentifier: string;          // v4, in src/ids.ts
  name?: string; description?: string;
  timeoutSeconds?: number;
  handler: LogicFunctionHandler;
  // any combination of triggers:
  httpRouteTriggerSettings?: { path: string; httpMethod: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE';
                               isAuthRequired: boolean; forwardedRequestHeaders?: string[] };
  cronTriggerSettings?: { pattern: string };                       // 5-field cron
  databaseEventTriggerSettings?: { eventName: string;              // '<objectNameSingular>.<action>'
                                   updatedFields?: string[]; batchMode?: boolean };
  toolTriggerSettings?: { inputSchema?: InputJsonSchema };         // exposes it to AI agents
  workflowActionTriggerSettings?: { inputSchema?; outputSchema?; icon?; label? };
  // OR (instead of the above, with a different handler type):
  serverRouteTriggerSettings?: { httpMethods?: ('GET'|'POST')[]; forwardedRequestHeaders?: string[] };
});
```

The SDK's own runtime validation checks the following:
- `universalIdentifier` and `handler` are present.
- A route has a `path` and an `httpMethod`.
- A cron has a `pattern`.
- A database event has an `eventName`.
- Server routes allow only GET and POST.

There are also install hooks: `definePreInstallLogicFunction`, `definePostInstallLogicFunction` and `defineUninstallLogicFunction`.

## Triggers

| Trigger | SDK 2.41 | Spike entity | Notes |
| --- | --- | --- | --- |
| `httpRoute` | ✅ | `src/logic-functions/health-check.ts`: `GET /health` → `{ ok, version: "2.41.0", timestamp }`, `isAuthRequired: false` | Served under `${TWENTY_FUNCTIONS_URL}` or `${server}/s`, so this is `https://crm.integrascientific.com/s/health`. The event follows the AWS HTTP API v2 shape. Return a plain object, or `new Response(body, { status, headers })` for a custom status. |
| `databaseEvent` | ✅ | `src/logic-functions/company-created.ts`: `company.created` → `console.log` | Event names are `<nameSingular>.<created\|updated\|deleted\|destroyed\|restored\|upserted>`. `updatedFields` filters `.updated`. `batchMode` delivers `{ events: [...] }`. The payload type has `workspaceMemberId?` (the actor), but whether it is filled is server-side and untested (F0.3c). |
| `cron` | ✅ | `src/logic-functions/daily-heartbeat.ts`: `0 6 * * *` → `console.log` | It needs the worker to register crons. Ours runs with `DISABLE_CRON_JOBS_REGISTRATION=true`, so expect it **not** to fire until that changes (or `cron:register:all` runs). |
| `tool` | ✅ (not spiked) | | Makes a function callable by Twenty AI agents. |
| `workflowAction` | ✅ (not spiked) | | Makes a function a step in Twenty workflows. |
| `serverRoute` | ✅ (not spiked) | | Resolver that dispatches to another function (`ServerRouteDispatchResult`). |
| `enqueueJobs` / `getJobs` | ✅ (not spiked) | | Async fan-out, up to 200 payloads per call. `enqueueJob` is deprecated. |

## Server-side prerequisites (not verified here)

From Twenty's self-hosting docs:

- `LOGIC_FUNCTION_TYPE` defaults to `DISABLED` when `NODE_ENV=production` and to `LOCAL` in development. Production must set `LOCAL` or `LAMBDA`. While it is disabled, every execution returns an error.
- `LAMBDA` is the recommended production driver because it isolates code. It needs `LOGIC_FUNCTION_LAMBDA_REGION`, `LOGIC_FUNCTION_LAMBDA_ROLE` and access keys. `LOCAL` runs app code inside the server process. That is acceptable for our own first-party app, but it is a decision to record.
- Cron triggers need cron registration on the worker (see above).
- Logic functions run with the **app role** (`src/app-role.ts`). That role is read-only today, so a write-capable function such as enquiry intake needs it widened first.

## Recommendation: logic functions or REST sidecar?

1. **Build E1 on the REST sidecar now** (`src/functions/enquiry-intake.ts`, `enquiry-triage.ts`, `ops/lib/twenty-api.ts`):
   - It needs no server change and no app-role change.
   - It needs no proof that the runtime works.
   - It is already the escape hatch that principle U5 asks for.
   - It still needs hosting: the `phase7-crm-functions.yaml` stack (API Gateway, two Lambdas, Node 22). Bundle the handlers with esbuild; `@anthropic-ai/sdk` and `zod` are devDependencies of this package for exactly that reason, and Twenty's app runtime must not receive them.
2. **On the dev workspace (`npm run dev`), finish F0.3**:
   - Set `LOGIC_FUNCTION_TYPE=LOCAL`.
   - `curl …/s/health` (a).
   - Create a Company and read the log, including whether `workspaceMemberId` is set (c).
   - Enable cron registration and check `daily-heartbeat` (b).
   - Measure the timeout ceiling (f).
   - Bundle `@anthropic-ai/sdk` (e).
   - Exit test: port `ops/nightly-status.mjs` to a cron function.
3. **If step 2 passes:**
   - Move intake to an `enquiry-intake` logic function (`httpRoute POST /enquiries/intake`, `isAuthRequired: true`).
   - Move triage to `enqueueJobs` → `enquiry-triage`.
   - Keep the sidecar code as the fallback.

   **If step 2 fails:** the sidecar stays the host. Only the Pages Function's target URL differs between the two paths.

## Not covered by this spike

- **(d) app secret variables.** The SDK supports them. `defineApplication({ applicationVariables: { ANTHROPIC_API_KEY: { universalIdentifier, isSecret: true, description } } })` declares a per-workspace variable whose value is set in the app's settings, not in the manifest. `serverVariables` declares server-wide ones (`isSecret`, `isRequired`). Not yet tested: whether a handler reads them as `process.env.<NAME>` (the docs' examples suggest so).
- **(h) upgrade compatibility.** This needs a container of the next Twenty release.
- **`twenty-ui` pinning (plan §0).** No front component uses it yet. The PromoteToLeadButton stub uses `--t-*` tokens like the existing components.
