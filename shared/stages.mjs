/**
 * The Integra opportunity pipeline. Single source of truth for:
 *   - src/views/pipeline-kanban.view.ts   (kanban columns)
 *   - ops/sync-opportunity-stages.mjs     (replaces Twenty's stock stage options)
 *   - verify-model.mjs                    (asserts the six-stage contract)
 *
 * Plain ESM (not TS) so the ops scripts and the static check can import it
 * without a build step. `value` is what Twenty stores; `label` is what the
 * operator sees. Order == pipeline order.
 */
export const OPPORTUNITY_STAGES = [
  { value: 'LEAD', label: 'Lead', color: 'gray', position: 0 },
  { value: 'WEBINAR_ATTENDED', label: 'Webinar attended', color: 'blue', position: 1 },
  { value: 'TRIAL', label: 'Trial', color: 'purple', position: 2 },
  { value: 'SUBSCRIBED', label: 'Subscribed', color: 'green', position: 3 },
  { value: 'RENEWAL_DUE', label: 'Renewal due', color: 'yellow', position: 4 },
  { value: 'LOST', label: 'Lost', color: 'red', position: 5 },
];

export const DEFAULT_OPPORTUNITY_STAGE = 'LEAD';
