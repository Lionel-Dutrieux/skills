# Writing a Payload plugin

Our plugins live in the `payload-plugins` monorepo, whose `CONTRIBUTING.md` holds the
procedure (changesets, releases, workflows). This file holds the shape and the rules every
plugin follows, the shape of Payload's official plugin template.

## Names

Settle them first: they are hard to change once published.

| Name | Form | Example |
|---|---|---|
| Folder | `packages/<name>` | `packages/audit-logs` |
| Package | `@lionel-dutrieux/payload-<name>` | `@lionel-dutrieux/payload-audit-logs` |
| Plugin slug | `<name>`, in `definePlugin` | `audit-logs` |
| Export | `<camelName>Plugin` | `auditLogsPlugin` |

## The package

- `exports`: `.` and `./types`, plus `./client` and `./rsc` when the plugin ships admin
  components, all pointing at `dist/`. ESM only, `"sideEffects": false`, `files` limited
  to `dist`, `README.md`, `CHANGELOG.md`.
- Build: swc for the JavaScript, `tsc` for the declarations.
- `payload`, `@payloadcms/*`, `react` and `next` are peer dependencies, bounded below the
  next major.
- Relative imports end in `.js` (`from './plugin.js'`): the package is ESM under
  `NodeNext`.

## `src/`

```
index.ts          server entry: the plugin, its option type, its helpers; never a component
plugin.ts         definePlugin<Options>({ slug, plugin: ({ config, ...options }) => … })
options.ts        resolveOptions: defaults, then validation
translations.ts   en and fr, under a namespace equal to the slug
components/       admin components, exported through exports/client.ts and exports/rsc.ts
exports/          client.ts, rsc.ts, types.ts
```

Files follow the official template: camelCase `.ts`, PascalCase `.tsx`. The ESLint layer
is `payloadPlugin` from `eslint-payload.mjs`, after `typescript` and `react`.

## Rules

- **Merge, never overwrite.** Spread the incoming config, collections, fields, hooks,
  endpoints, `admin.components` and translations; chain `onInit` after the host's.
- **`disabled` keeps the schema.** Collections and fields are added even when the plugin is
  disabled, so migrations match between environments; only behaviour switches off.
- **Closed by default.** A field or collection the plugin owns declares its own `access`.
- **No environment variable.** Configuration arrives through options, secrets through
  functions the host provides (`secret: () => …`).
- **Admin components are referenced by path**: `'@lionel-dutrieux/payload-<name>/rsc#Name'`.
- **Errors**: a misconfiguration throws at boot as `'<name> plugin: …'`, saying what to
  fix; a refusal at runtime is an `APIError` subclass with its status and a code.

## Tests

- `tests/unit/plugin.unit.spec.ts` applies the plugin to a bare config: what it adds, what
  `disabled` keeps, what it merges.
- `tests/int/` boots a generic host config on Postgres and goes through
  the Local API (`references/testing.md`).
- What the plugin shows in the admin gets a Playwright spec in the monorepo's dev app.
