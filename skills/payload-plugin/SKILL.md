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
options.ts        resolveOptions, and fail = failure('<Name> plugin') from the kit
types.ts          the public option types
translations.ts   en and fr, namespace = slug, mergeTranslations()
components/       admin components; a server one and its 'use client' half are `Name.tsx` and
                  `NameClient.tsx` (or `NameField.tsx` for a field), a component with no server
                  half keeps its own name
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

## The kit

`@lionel-dutrieux/payload-kit` (`packages/kit`) holds what two plugins or more share; a
plugin lists it as a regular dependency. Reach for it before writing a helper: options
checks (`failure`, `refuseUnknown`, `isPlainObject`, `quoted`), access (`noOne`,
`adminUsers`, `signedInAdminUser`), plugin write guards, job and retention helpers,
advisory locks, and the tenant helpers. A helper moves into the kit when a second plugin
needs it. Its README lists every export.

## Rules

- **Options are resolved at boot.** `resolveOptions` refuses unknown keys with the kit's
  `refuseUnknown` (or a Zod `strictObject` for a deep option tree) (`unknown option "jobs.queue"; expected "jobs.autoRun".`), checks every
  value's type (`disabled` included), applies defaults and returns a `ResolvedOptions`.
  Every error goes through the plugin's `fail`, saying what to fix.
- **A slug or route already taken by the host is an error**, checked before anything is
  added. The plugin never replaces what the host declared.
- **Merge, never overwrite.** The host's hooks, collections, endpoints and
  `admin.components` come first and the plugin's after; the host's `onInit` runs first. A
  hook that guards what the plugin owns (stripping a system field before the host's
  hooks see it) runs first, with a comment saying why.
  A host value of `false` (`endpoints: false`) stays `false`. Translations:
  `deepMergeSimple(translations, incoming.translations)`, so the project wins.
- **`disabled` keeps the schema**: collections, fields, job tasks and translations stay, so
  migrations match between environments. Endpoints, acting hooks, admin UI and `onInit`
  switch off.
- **Closed by default.** Every collection and every field the plugin owns declares its
  `access`, `readVersions` and `unlock` included: `noOne` for writes,
  `options.access.read ?? adminUsers(config.admin.user)` for reads — the admin's users,
  never any auth collection. `admin.readOnly` is a UI hint, not access. The host widens
  through `<thing>Overrides`.
- **The plugin's own writes** (deliveries, a journal) pass the kit's `pluginWriteGuard`,
  whose state lives on the runtime object the plugin puts on `config.custom`: Next can
  load the plugin's modules twice, and a `req.context` flag is any caller's to set.
- **The schema depends on no option.** A list the options or the host's collections
  decide is a `text` field with validation, not a `select`: each new value of a `select`
  is a Postgres enum migration.
- **Ids carry no order.** Hosts use UUIDs: sort and paginate by a timestamp, then `id`.
- **No environment variable.** Configuration arrives through options; secrets through
  functions the host provides (`secret: () => …`).
- **Errors**: configuration → `fail()` at boot. A refusal over HTTP → an `APIError`
  subclass with its status and a translated message, or Payload's `Forbidden` /
  `NotFound`. Codes, not sentences, cross the wire.
- **Logs**: `payload.logger` / `req.payload.logger` with the plugin's prefix, the error as
  `{ err }` so its stack is kept. `console` only in a CLI.
- **The site's cached reads** (settings, themes, messages, routes) go through Next's cache
  under the tags the `revalidate` plugin emits for the documents read, tested against its
  `createTags`. The plugin invalidates nothing itself, and warns at startup through
  `payload.logger` when `custom.revalidate` does not cover what it reads. A time-to-live
  is at most an opt-in, off by default, never the invalidation. A lookup Payload keeps for
  itself, read outside Next too (tenant-domains' map of domains), may stay in memory.
- **Admin components are referenced by path** (`'@lionel-dutrieux/payload-<name>/rsc#Name'`),
  never imported from the server entry. They are native Payload UI: `@payloadcms/ui`
  components, Payload's CSS variables, styles in a CSS file under
  `@layer payload-default`, Payload's icons and never an emoji.

## References

| File | Read it when |
|---|---|
| `references/security.md` | Storing data per tenant, building a URL or link, adding an endpoint |
| `references/package.md` | Editing `package.json`, exports, peers, a CLI, a `./next` entry |
| `references/testing.md` | Writing the plugin's tests |
| `references/docs.md` | Writing the README, `CONTEXT.md` or an ADR |
