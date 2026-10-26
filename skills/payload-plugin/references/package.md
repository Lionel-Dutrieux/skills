# The package

- **`exports`**: `.` and `./types` always; `./client` and `./rsc` when the plugin ships admin
  components; `./next` when the front end needs code that must not import `payload` (the
  revalidate handler, the translations loader). A plugin whose public site imports React
  components from `./client` (consent's banner) moves its admin components to `./admin`,
  so the site never loads `@payloadcms/ui`. CSS a site imports is exported as
  `./styles.css`. Each points at `dist/`, conditions in the order `types`, `import`,
  `default`.
- **A `./next` entry loads no Payload**, through any import: it reaches the kit only by
  `@lionel-dutrieux/payload-kit/tenant-domains`, whose module imports nothing, and keeps its
  own copy of any other helper. A unit spec walks its imports to hold that.
- ESM only (`"type": "module"`), `files`: `dist`, `README.md`, `CHANGELOG.md`.
  `"sideEffects": false`, or `["*.css"]` when the package ships CSS. `version` starts at
  `0.0.0`; the first changeset sets it.
- **Peers, not dependencies**, for `payload`, `@payloadcms/*`, `react` and `next`, written
  `catalog:peers`. A peer is optional (`peerDependenciesMeta`) only when an entry such as
  `./next` runs without it. The kit is a dependency, `workspace:*`. Every other version is
  `catalog:`.
- **Build**: swc for the JavaScript, `tsc -p tsconfig.build.json` for the declarations.
  `.swcrc`, `tsconfig*.json` and `eslint.config.js` are the shared ones, unchanged;
  `vitest.config.ts` adds a project at most.
- Relative imports end in `.js`: the package is `NodeNext`.
- **A CLI** is a Payload `bin` registered in the config (`payload <command>`), so it runs
  with the host's config loaded. A standalone npm `bin` only for a tool that runs without
  Payload.
- Scripts: those of `packages/oidc`, plus `build:css` for a package that ships CSS.
