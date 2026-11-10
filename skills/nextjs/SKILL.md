---
name: nextjs
description: Next.js App Router conventions for keyes-dxp apps, with Payload embedded or as a headless front. Use when adding a route, page, layout, route handler, server action or data read; creating a feature or organizing src/; caching or revalidating; adding a language, a translation key or any text shown to a visitor; or touching env vars, next-intl, next.config, instrumentation or logging.
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
  i18n/                routing.ts, navigation.ts, request.ts → references/i18n.md
  env.ts  instrumentation.ts  proxy.ts  global.d.ts
messages/<locale>.json  the words, beside src/, not in it
```

Payload's own folders sit beside these (`payload` skill), with `src/plugins/` for the
plugins a project wires.

## A feature

One way to build a feature, in every project. A feature is a part of the product, named
in kebab-case after what it is about (`posts`, `contact-form`, `tenants`), not after a
layer:

```
features/<feature>/
  components/        its UI; <feature>-screen.tsx is what the page renders
  data/<thing>.ts    its DAL, every file starting with `import 'server-only'`, handing out DTOs
  actions.ts         its server actions (actions/<verb>.ts once it holds many)
  schemas.ts         the Zod schemas its forms and actions share
  lib/               pure helpers, hooks (use-*.ts), TanStack Query options (queries.ts)
```

- **`data/`, never `server/`, `services/` or `repositories/`.** Those names say where code
  runs or name a pattern, not what the folder holds. `data/` is the only folder that
  reads, and the only one `server-only` guards; actions run on the server too, and live
  in `actions.ts`.
- **No generic repository.** One `createCollectionRepository` for every collection drifts
  into `overrideAccess: true` for anonymous reads and a hand-made `unstable_cache` whose
  key forgets the user. Each read is a named function of the feature's `data/`, with its
  actor.
- **A feature uses another through its `data/` (server side) or its `components/`**, never
  its `lib/` internals. The tenant of a page, for instance, is `requestTenant()` in
  `features/tenants/data/`.
- **A file used by one feature lives in that feature.** It moves up to `src/components/`
  or `src/lib/` when a second feature needs it.

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

Cache Components are on in both shapes.

- **Never `unstable_cache`.** Next 16 replaced it with `'use cache'`: it is the previous
  model, and nothing new is written with it, in an app or in a plugin. Never the `dynamic`
  and `revalidate` segment configs either, which Cache Components refuse.
- **A public read is cached where it is written**: a function of a feature's `data/` with
  `'use cache'`, `cacheLife('content')` and `cacheTag`. Its arguments are its key, it
  returns plain values, and the CMS invalidates its tags
  (`@lionel-dutrieux/payload-revalidate`).
- **`content`, never `max`.** The profile is declared in `next.config.ts`: kept on the
  server until the CMS invalidates it, which it does at once, and 30 seconds in a
  visitor's browser, the least Next allows. `max` lets a browser reuse a page for five
  minutes: an editor who comes back to it does not see what they published.
- **A read for one user is never cached.** It renders under `<Suspense>`.
- **A public page never reads the request**: no `headers()`, `cookies()`, `connection()`
  or `searchParams` in it, nor in what it calls. Its layout sets
  `ensureStatic = 'navigation'`: Next prerenders the page at its first visit, keeps it,
  and answers with its own status (404, 308). A page that reads the request answers 200
  before it renders.
- **Several tenants**: the proxy writes the request's host into the page's own URL
  (`/[site]/[locale]/…`), and `requestTenant()` reads that segment with
  `next/root-params`.
- After a write, the action updates the cache → `references/mutations.md`.

→ `references/caching.md`. Turning it on in an existing app: the official
`next-cache-components-adoption` skill.

## `next.config.ts`

`output: 'standalone'` for the Docker image, `reactCompiler: true` (with
`babel-plugin-react-compiler`), and `experimental.serverSourceMaps: true` so stack traces
point at `src/`. Both shapes set `cacheComponents: true`, `partialPrefetching: true` and
the `content` profile of `cacheLife` (`references/caching.md`).

## Env

`src/env.ts` declares every variable with `@t3-oss/env-nextjs`, and the code reads `env`.
Variables stay server-side: a `NEXT_PUBLIC_*` value is frozen into the build, and one
image runs in several environments.

## i18n

next-intl from the first page, even with one language: a second one is then one more
file, not a hunt for strings.

- **Where**: the words in `messages/<locale>.json` at the root. `src/i18n/routing.ts`
  holds the locales, `navigation.ts` the `Link`, `redirect` and `useRouter` that internal
  links use, `request.ts` the locale, messages and `timeZone`. With one language,
  `request.ts` alone, and no locale segment in the URL.
- **Keys**: in English, one top-level namespace per feature (`posts.title`), `common` for
  what several features share.
- **Typed**: `AppConfig` in `src/global.d.ts` types the messages and the locales, so a key
  missing from the default locale fails `tsc`. A unit test checks that every locale has
  the same keys and the same ICU placeholders.
- **No word in a component.** The site's words are in `messages/`; the admin's in
  Payload's `i18n.translations` and the plugins' `translations.ts`. Editors override the
  site's through the `translations` plugin.
- **Dates** go through next-intl's formatter, in the app's `timeZone`.

→ `references/i18n.md`

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
| `references/caching.md` | Caching a read, prerendering a page, finding the tenant of a page |
| `references/lists.md` | Building a list with search, filters, sort or pagination |
| `references/mutations.md` | Writing a server action, or handling what it returns |
| `references/i18n.md` | Setting up next-intl, adding a language or a key, typing the messages |
| `references/headless.md` | Working in `apps/web` of a headless repo |
| `references/observability.md` | Logging, tracing or reporting an error |
| `references/docs.md` | Writing the technical documentation (Fumadocs) |

The ESLint layer is `assets/eslint-next.mjs`, synced as `typescript`'s
`references/config.md` describes.
