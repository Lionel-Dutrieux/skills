# Tests

The layout of Payload's official templates, plus a `unit/` folder.

```
tests/
  unit/      *.unit.spec.ts(x)  Vitest — pure functions, synchronous components
  int/       *.int.spec.ts      Vitest — code against real services (database, Payload)
  e2e/       *.e2e.spec.ts      Playwright — the running app, through the browser
  helpers/                      shared setup: sign-in, seed, fixtures
```

## Which layer

| What is tested | Layer |
|---|---|
| A pure function, a Zod schema, a mapper | `unit` |
| A synchronous component | `unit`, with `// @vitest-environment jsdom` on the file's first line |
| Data access, access control, a hook, a job | `int` — `payload` skill, `references/testing.md` |
| An async Server Component, a page, a flow across pages | `e2e` — Vitest cannot render async Server Components |

Test first what costs most when it breaks: money, permissions, data loss. An access rule
that silently returns `true` deserves more tests than a component's class names. Tests go
through the public surface — what a caller or a user sees — never through implementation
details or snapshots of a component tree.

## Vitest

- The `unit` and `int` projects come from `.config/keyes-dxp/vitest.base.ts`. Run one
  with `pnpm test:unit` or `pnpm test:int`.
- `int` runs one file at a time, because the files share one database. Each test creates
  the rows it needs and deletes them afterwards.
- The network is faked: a test never reaches a third-party service.

## Playwright

- The base comes from `.config/keyes-dxp/playwright.base.ts`. The app adds its
  `webServer` (`nextjs` skill).
- Locate elements by role and accessible name (`getByRole('button', { name: 'Save' })`).
- Sign-in lives once in `tests/helpers/`, reused by every spec.
