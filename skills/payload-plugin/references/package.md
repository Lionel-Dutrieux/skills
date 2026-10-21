# The package

- **`exports`**: `.` and `./types` always; `./client` and `./rsc` when the plugin ships admin
  components; `./next` when the front end needs code that must not import `payload` (the
  revalidate handler, the translations loader). Each points at `dist/`, conditions in the
  order `types`, `import`, `default`.
- ESM only (`"type": "module"`), `"sideEffects": false`, `files`: `dist`, `README.md`,
  `CHANGELOG.md`. `version` starts at `0.0.0`; the first changeset sets it.
- **Peers, not dependencies**, for `payload`, `@payloadcms/*`, `react` and `next`, written
  `catalog:peers`. A peer is optional (`peerDependenciesMeta`) only when an entry such as
  `./next` runs without it. Every other version is `catalog:`.
- **Build**: swc for the JavaScript, `tsc -p tsconfig.build.json` for the declarations.
  `.swcrc`, `tsconfig*.json`, `eslint.config.js` and `vitest.config.ts` are the shared
  ones, unchanged.
- Relative imports end in `.js`: the package is `NodeNext`.
- **A CLI** is a Payload `bin` registered in the config (`payload <command>`), so it runs
  with the host's config loaded. A standalone npm `bin` only for a tool that runs without
  Payload.
- Scripts: `build`, `clean`, `dev`, `lint`, `test`, `test:unit`, `test:int`, `typecheck`.
