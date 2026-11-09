# Documenting a plugin

- **The docs site, `apps/docs`, is the single source**: a plugin's pages live under
  `apps/docs/content/docs/plugins/<name>/`, written as `apps/docs/WRITING.md` says, with a
  `changelog.mdx` that includes the package's `CHANGELOG.md`. Options are documented in
  their JSDoc, which `<auto-type-table>` renders.
- **README**: a summary that links to those pages (what it does, Install, a minimal Usage),
  never a second copy of them.
- **`CONTEXT.md`**: the plugin's glossary, with the terms to avoid. Listed in the root
  `CONTEXT-MAP.md`.
- **`docs/adr/NNNN-<title>.md`**: one decision each, in three parts — Considered options,
  Why, Consequences. A decision a reader would question gets an ADR.
- Everything in English. A user-facing string lives in `translations.ts`, never in a
  component or an error.
