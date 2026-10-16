# Monorepo

A repo becomes a pnpm + Turborepo monorepo from its second deployable app (the headless
stack: a front and a CMS). One app stays a flat repo.

```
apps/<app>/              a deployable app (web, cms)
packages/<package>/      code shared by apps (cms-types)
.config/keyes-dxp/       the synced config, shared by every app and package
pnpm-workspace.yaml      workspaces + the version catalog
turbo.json
package.json             root scripts only
```

## Rules

- An app depends on packages, never on another app.
- Every external version lives once, in the `catalog:` of `pnpm-workspace.yaml`. A
  `package.json` says `"zod": "catalog:"`; an internal dependency says `"workspace:*"`.
- An internal package exports its TypeScript source and has no build step
  (`"exports": { ".": "./src/index.ts" }`). Only a published package builds.
- Every app and package uses the same script names: `build`, `dev`, `lint`, `typecheck`,
  `test:unit`, `test:int`, `test:e2e`. Run them from the root:
  `pnpm turbo run lint`, or `pnpm turbo run dev --filter web`.
- Each app's configs point at the shared layers: `"extends":
  "../../.config/keyes-dxp/tsconfig.base.json"`, `import … from
  '../../.config/keyes-dxp/eslint-typescript.mjs'`.

## `turbo.json`

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": {},
    "test:unit": {},
    "test:int": { "cache": false },
    "test:e2e": { "cache": false }
  }
}
```

A task that reads an env var lists it in `env`, so the cache keys on it.
