# Testing a plugin

```
test/
  unit/plugin.spec.ts        the plugin applied to a bare config, no database
  unit/*.spec.ts             pure helpers
  int/config.ts              a generic host on Postgres, from DATABASE_URL
  int/multi-tenant-config.ts the same host with @payloadcms/plugin-multi-tenant, when the
                             plugin stores data per tenant
  int/*.spec.ts              through the Local API
```

`plugin.spec.ts` checks, every time:

- the slug, and what the plugin adds;
- the access of every collection and field it owns, closed;
- what `disabled` keeps and what it switches off;
- that the host's hooks, endpoints and `onInit` come first, and `false` stays `false`;
- the translation merge, the project winning;
- each refusal of `resolveOptions`, and of a slug already taken.

Integration specs boot Payload once per file, act with a user and `overrideAccess: false`,
and delete the rows they wrote. Each security rule of `security.md` the plugin touches
gets its edge case: the other tenant's write, the forged `Host`, the cross-site post. A
plugin that orders rows runs the specs concerned again on a host with `idType: 'uuid'`
(audit-logs' `int-uuid` project). Anything the plugin shows in the admin gets a Playwright
spec in `apps/dev/test/e2e/`. README examples are type-checked by a unit spec.
