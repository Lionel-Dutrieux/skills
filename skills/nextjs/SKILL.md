---
name: nextjs
description: Next.js App Router conventions for keyes-dxp apps, with Payload embedded or as a headless front. Use when adding a route, page, layout, route handler, server action or data read; organizing src/ or a feature folder; caching or revalidating; or touching env vars, i18n, next.config, instrumentation or logging.
---

# keyes-dxp Next.js

Load first: `react`, and `payload` when Payload is embedded or sits behind the app.
For any Next.js API, the reference is the documentation bundled in
`node_modules/next/dist/docs/`, which the `AGENTS.md` block written by `next dev` points to.

## Stack

On top of the `typescript` and `react` tables:

| Need | Use |
|---|---|
| Framework | Next.js 16, App Router |
| Server actions | next-safe-action |
| Env vars | `@t3-oss/env-nextjs` |
| i18n | next-intl |
| Server-only modules | `server-only` |
| React Compiler | `babel-plugin-react-compiler` |
| Tracing | `@vercel/otel` + `@opentelemetry/instrumentation-pino` |
| Readable logs in development | `pino-pretty` |
| Technical documentation | Fumadocs, inside the app → `references/docs.md` |
| Reading Payload from a headless front | `@payloadcms/sdk` |
| Cache invalidation from the CMS | `@lionel-dutrieux/payload-revalidate` |

## Two shapes

| Shape | Repo | The DAL reaches Payload through |
|---|---|---|
| `next-payload` | one app | the Local API |
| `next-headless` | Turborepo: `apps/web` + `apps/cms` | `@payloadcms/sdk` → `references/headless.md` |

A new project starts from the template of its shape; ask the user for the templates
repository.

## `src/`

```
src/
  app/                 routes only: pages, layouts, route handlers
  features/<feature>/  everything else of each feature
  components/          ui/ (shadcn CLI), form/ (form kit), components shared by features
  lib/                 safe-action.ts, utils.ts, hooks/, logger.ts (without Payload)
  i18n/request.ts
  env.ts  instrumentation.ts  proxy.ts
```

Payload's own folders sit beside these (`payload` skill). A feature:

```
features/<feature>/
  components/   its UI; <feature>-screen.tsx is what the page renders
  data/         its DAL, every file starting with `import 'server-only'`
  actions.ts    its server actions
  schemas.ts    the Zod schemas its forms and actions share
  lib/          pure helpers, hooks (use-*.ts), TanStack Query options (queries.ts)
```

A file used by one feature lives in that feature. It moves up to `src/components/` or
`src/lib/` when a second feature needs it.

## The page is a door

A `page.tsx` authenticates, parses its params and search params, and renders the feature's
screen. Everything else happens in the feature.

```tsx
const PostsPage = async () => {
  const actor = await requireActor()
  return <PostsScreen actor={actor} />
}

export default PostsPage
```

## The Data Access Layer

Every read and every write goes through a feature's `data/`. The DAL alone talks to
Payload or any other source; pages, components, actions and route handlers call the DAL.

- **The actor comes first**: `getPosts(actor)`, `createPost(actor, input)`. It comes from
  `getActor()` or `requireActor()` in `features/auth/data/actor.ts`. A public read takes
  no actor.
- **Payload decides access.** The DAL hands it the actor: `user` with
  `overrideAccess: false` on the Local API, the user's token through the SDK.
- **DTOs leave the DAL.** A mapper such as `toPostDto` keeps the fields the UI renders; a
  document stays inside.

→ `references/data.md`

## Reads

Take the first that fits:

1. A Server Component awaits the DAL.
2. A promise from the DAL, passed to a Client Component and read with `use()`.
3. TanStack Query, when the browser keeps the data fresh or shares it: infinite scroll,
   polling, optimistic updates. The server still renders the first page.

A Client Component reaching data over HTTP calls a GET route handler in `app/api/`.

A list with search, filters, sort or pagination keeps its state in the URL, and the server
renders every state of it → `references/lists.md`.

## Mutations

A server action writes; reads go through the DAL. Every action is built with
next-safe-action: `authActionClient` behind sign-in, `actionClient` otherwise, both in
`src/lib/safe-action.ts`. It parses its input with the feature's schema, calls the DAL,
updates the cache and returns what the UI needs. → `references/mutations.md`

## Caching

- `next-payload`: Cache Components off. After a write, the action calls `refresh()`.
- `next-headless`: Cache Components on. Public DAL reads are `'use cache'` with a
  `cacheTag`, and the CMS invalidates them. Turning it on in an existing app: the official
  `next-cache-components-adoption` skill.

## `next.config.ts`

`output: 'standalone'` for the Docker image, `reactCompiler: true` (with
`babel-plugin-react-compiler`), and `experimental.serverSourceMaps: true` so stack traces
point at `src/`. The headless front adds `cacheComponents: true`.

## Env

`src/env.ts` declares every variable with `@t3-oss/env-nextjs`, and the code reads `env`.
Variables stay server-side: a `NEXT_PUBLIC_*` value is frozen into the build, and one
image runs in several environments.

## i18n

next-intl. Keys in English, in `messages/<locale>.json`. `src/i18n/request.ts` sets the
locale, the messages and the `timeZone`, and dates are formatted with next-intl's
formatter. The URL carries a locale segment only when the app ships several locales.

## Observability

Payload's logger (or `src/lib/logger.ts` without Payload), OpenTelemetry through `src/instrumentation.ts`, each
unexpected error logged once → `references/observability.md`.

## Official skills

| Skill | When |
|---|---|
| `next-dev-loop` | Checking a change in the running app |
| `next-cache-components-adoption` | Turning Cache Components on |
| `next-bundle-optimizer` | A route ships too much JavaScript |
| `payload` | The Local API or the SDK |

## References

| File | Read it when |
|---|---|
| `references/data.md` | Writing a read: DAL, DTO, actor, TanStack Query, route handler |
| `references/lists.md` | Building a list with search, filters, sort or pagination |
| `references/mutations.md` | Writing a server action, or handling what it returns |
| `references/headless.md` | Working in `apps/web` of a headless repo |
| `references/observability.md` | Logging, tracing or reporting an error |
| `references/docs.md` | Writing the technical documentation (Fumadocs) |

The ESLint layer is `assets/eslint-next.mjs`, synced as `typescript`'s
`references/config.md` describes.
