# Opportunity extensions

One `defineField` per file (the SDK builder registers one default export per file).

The pipeline stages (Lead → Webinar attended → Trial → Subscribed → Renewal
due → Lost) live on Twenty's STANDARD `stage` select so the stock "By Stage"
kanban and our "Pipeline" kanban group by the same column. An App manifest
cannot rewrite a standard field's options, so the replacement is applied by
`ops/sync-opportunity-stages.mjs` from `shared/stages.mjs` (same source the
Pipeline view's columns are generated from).
