# Company extensions

One `defineField` per file (the SDK builder registers one default export per file).

Labels are `EN · 中文`, English first. The e2e journey (crm/e2e) finds four
of these by English prefix — `WeChat ID`, `Province`, `Product category`,
`Tier` — so those prefixes are a contract; verify-model.mjs asserts them.
