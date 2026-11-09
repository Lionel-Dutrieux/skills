---
name: typescript
description: Base conventions for every keyes-dxp TypeScript codebase. Use when creating, naming or moving a file, adding a dependency, validating input, handling errors, logging or dates, writing tests, working in a monorepo, or setting up or syncing a project's lint, format and tsconfig.
---

# keyes-dxp TypeScript

The base layer. `react`, `nextjs` and `payload` build on it.

These skills are a baseline, not a freeze. When the project at hand differs from them —
another library, another layout, another convention — tell the user what differs before
writing code, and let them choose: follow the project, align it with the skill, or change
the skill.

## Stack

| Need | Use |
|---|---|
| Package manager | pnpm |
| Runtime | Node 24 |
| Language | TypeScript 6.0 — the highest version typescript-eslint supports |
| Lint and format | ESLint 10 + Prettier, through the synced config; oxlint + oxfmt in the payload-plugins repo and the projects `create-app` generates |
| Validation | Zod 4 |
| HTTP | the native `fetch` |
| Logging | pino |
| Dates | date-fns 4 + `@date-fns/tz` |
| Tests | Vitest 5 and Playwright |

The payload-plugins repo and the projects `create-app` generates take their versions from
that repo's catalog (`pnpm-workspace.yaml`), and their lint and format from oxlint and
oxfmt, as Payload's own repository does: their `.oxlintrc.json` and `.oxfmtrc.json` are
the config there, and the rules below hold through them.
| LLM calls | Vercel AI SDK (`ai`) |

A need with no row: ask the user which library to use, then propose adding the row.
Before adding a package, check `package.json`: it may already be there, brought by another
one (shadcn components bring theirs). Before writing code against a library, read its
installed version, then its docs for that version.

A change is done when `pnpm lint`, `pnpm typecheck` and the tests it touches pass.

## Config

The project's lint, format and TypeScript configs are copies of this skill's `assets/` (and
of the other skills' layers), kept in `.config/keyes-dxp/`. They are the source of truth:
make the code satisfy them. A rule changes in the skill, then gets re-synced.
Setting up or syncing a project → `references/config.md`.

What the config enforces, so the code is right the first time: named exports (default
exports only where a framework requires one), `type` aliases, arrow functions, kebab-case
file names, no `console`, no `export *`, and `noUncheckedIndexedAccess`.

## Naming and language

- Files and folders are kebab-case.
- A framework's territory keeps its own convention: Next.js special files and route
  segments (`nextjs` skill), Payload's collections, globals, blocks, fields, access and
  hooks (`payload` skill).
- Code, comments, docs and commit messages are in English.
- A comment says why, and only where the code cannot.

## Boundaries

Everything that enters the code — action input, form data, search params, a route handler
body, a webhook, an env var, a third-party response — is parsed by a Zod schema before
use. A file the package itself ships and reads back (a manifest it embeds, its own build
output) is not a boundary. Types come from the schema with `z.infer`, declared once. Zod 4 puts formats at the
top level (`z.email()`, `z.uuid()`) and customizes messages through a single `error`
parameter.

## Errors

- **Expected** (invalid input, forbidden, not found, a business refusal): a return value
  carrying a stable code such as `'forbidden'`. The UI translates the code.
- **Unexpected**: thrown, and caught in one place per entry point, which logs it.
- **Misconfiguration**: thrown at boot, with a message that says what to fix.

## Logging

pino, server-side only. With Payload in the app, it is Payload's own logger:
`req.payload.logger` wherever a `req` exists, `payload.logger` elsewhere. Without Payload
(a headless front), `src/lib/logger.ts`. Log objects, not strings:
`logger.error({ err, postId }, 'Publishing failed')`.

## Dates

- Transport and storage: ISO 8601 strings in UTC.
- Display: the i18n formatter with the app's time zone (`nextjs` skill).
- Arithmetic: date-fns, with `@date-fns/tz` for time zones. Stay on date-fns until Safari
  ships `Temporal`.

## References

| File | Read it when |
|---|---|
| `references/config.md` | Setting up a project's lint, format, tsconfig or test config, or syncing it |
| `references/testing.md` | Writing or running a test |
| `references/monorepo.md` | Working in a repo with several apps or packages |
