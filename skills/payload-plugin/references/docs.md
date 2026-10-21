# Documenting a plugin

- **README**, in this order: what it does (one paragraph), Install, Usage, Options (a table
  per option group), What the plugin installs (collections, fields, endpoints, jobs —
  with the migration to create after installing), Multi-tenant, Limits. A README past a
  few hundred lines opens with a Contents list.
- **`CONTEXT.md`**: the plugin's glossary, with the terms to avoid. Listed in the root
  `CONTEXT-MAP.md`.
- **`docs/adr/NNNN-<title>.md`**: one decision each, in three parts — Considered options,
  Why, Consequences. A decision a reader would question gets an ADR.
- Everything in English. A user-facing string lives in `translations.ts`, never in a
  component or an error.
