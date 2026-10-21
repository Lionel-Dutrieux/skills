---
name: payload-plugin
description: keyes-dxp conventions for writing a Payload CMS plugin package (the payload-plugins monorepo). Use when creating a plugin, adding an option, a collection, a field, a hook, an endpoint or an admin component to one, writing its tests, or reviewing a plugin for consistency with the others.
---

# keyes-dxp Payload plugin

Load first: `typescript`, and `payload` for the app side. How Payload's plugin API works:
the official `payload` skill and Payload's own plugins in `node_modules/@payloadcms/plugin-*`.
This skill holds what all our plugins share. The repo's `CONTRIBUTING.md` holds the
procedure (changesets, releases, workflows).

## Names

| Name | Form | Example |
|---|---|---|
| Folder | `packages/<name>` | `packages/audit-logs` |
| Package | `@lionel-dutrieux/payload-<name>` | `@lionel-dutrieux/payload-audit-logs` |
| Slug | `<name>` | `audit-logs` |
| Export | `<camelName>Plugin` | `auditLogsPlugin` |
| Translation namespace | the slug | `'audit-logs'` |
| Error prefix | `'<Name> plugin: '` | `'Audit logs plugin: '` |
| Log prefix | the same | `'Audit logs plugin: '` |

Files are kebab-case (`resolve-account.ts`), components PascalCase (`AuditTabView.tsx`).

## `src/`

```
index.ts          server entry: the plugin, its option types, its helpers; never a component
plugin.ts         definePlugin
options.ts        resolveOptions and the plugin's single fail()
types.ts          the public option types
translations.ts   en and fr, namespace = slug, mergeTranslations()
components/       admin components; `Name.tsx` (server) and `NameClient.tsx` ('use client')
exports/          client.ts, rsc.ts, types.ts — and next.ts for a front-end entry
<domain>/         one folder per concern once src/ grows (capture/, sinks/, jobs/…)
```

```ts
export const auditLogsPlugin = definePlugin<AuditLogsPluginConfig>({
  slug: 'audit-logs',
  plugin: ({ config, plugins: _plugins, ...options }): Config => {
    const resolved = resolveOptions(options, config)
    // …
  },
})
```

No `order`, unless two plugins truly depend on each other's output.

## Rules

- **Options are resolved at boot.** `resolveOptions` refuses unknown keys, checks every
  value's type (`disabled` included), applies defaults and returns a `ResolvedOptions`.
  Every error goes through the plugin's one `fail()`, saying what to fix.
- **A slug or route already taken by the host is an error**, checked before anything is
  added. The plugin never replaces what the host declared.
- **Merge, never overwrite.** The host's hooks, collections, endpoints and
  `admin.components` come first and the plugin's after; the host's `onInit` runs first.
  A host value of `false` (`endpoints: false`) stays `false`. Translations:
  `deepMergeSimple(translations, incoming.translations)`, so the project wins.
- **`disabled` keeps the schema**: collections, fields, job tasks and translations stay, so
  migrations match between environments. Endpoints, acting hooks, admin UI and `onInit`
  switch off.
- **Closed by default.** Every collection and every field the plugin owns declares its
  `access`: `noOne` for writes, `options.access.read ?? noOne` for reads. `admin.readOnly`
  is a UI hint, not access. The host widens through `<thing>Overrides`.
- **No environment variable.** Configuration arrives through options; secrets through
  functions the host provides (`secret: () => …`).
- **Errors**: configuration → `fail()` at boot. A refusal over HTTP → an `APIError`
  subclass with its status and a translated message, or Payload's `Forbidden` /
  `NotFound`. Codes, not sentences, cross the wire.
- **Logs**: `payload.logger` / `req.payload.logger` with the plugin's prefix. `console`
  only in a CLI.
- **Admin components are referenced by path** (`'@lionel-dutrieux/payload-<name>/rsc#Name'`),
  never imported from the server entry.

## References

| File | Read it when |
|---|---|
| `references/package.md` | Editing `package.json`, exports, peers, a CLI, a `./next` entry |
| `references/testing.md` | Writing the plugin's tests |
| `references/docs.md` | Writing the README, `CONTEXT.md` or an ADR |
