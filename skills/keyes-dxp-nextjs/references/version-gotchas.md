# Version gotchas

Model training data lags behind these libraries. Everything below is a case where the
"remembered" API is wrong for the version we use. **Read `package.json`, then the current
docs, before writing code.**

## Verification procedure (not optional)

```bash
# 1. What is actually installed?
cat package.json
pnpm list <package>          # exact resolved version
```

2. Pull current docs for that version — context7 MCP if available, otherwise fetch the
   official docs site. Do not rely on parametric memory for any library in this file.
3. Only then write code. If docs and memory disagree, docs win.

## Tailwind CSS v4

- Configuration is **CSS-first**. There is no `tailwind.config.js` by default.
- Entry point is `@import "tailwindcss";` — not the v3 `@tailwind base/components/utilities`
  triple.
- Customization goes in `@theme { }` inside CSS, using CSS custom properties.
- Plugins are loaded from CSS: `@plugin "@tailwindcss/typography";`
- PostCSS plugin is `@tailwindcss/postcss`, not `tailwindcss`.
- Content paths are auto-detected; no `content: []` array to maintain.

```css
/* app/globals.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  --color-brand-500: oklch(0.62 0.19 258);
  --font-display: "Inter", sans-serif;
  --radius-card: 0.75rem;
}
```

Utilities then exist automatically: `bg-brand-500`, `font-display`, `rounded-card`.

## shadcn/ui

- Install components with `pnpm dlx shadcn@latest add <component>`. Never hand-write one.
- The CLI writes into `components/ui/` and is meant to be edited afterwards — the files
  are yours, upgrades are re-runs of `add`.
- `cn()` lands in `lib/utils.ts` on init; import it from there rather than re-implementing.
- `cmdk` is consumed only through the generated `Command` component.
- Charts come from `pnpm dlx shadcn@latest add chart` and expect a `ChartConfig` object
  plus `ChartContainer` / `ChartTooltip` wrappers around Recharts primitives.

## next-safe-action

- The input schema method is **`.inputSchema()`**. Older docs and model memory say
  `.schema()` — that name is deprecated.
- Middleware is `.use(async ({ next, ctx }) => next({ ctx: { ... } }))`, composable by
  chaining clients.
- The client hook is `useAction` / `useOptimisticAction` from `next-safe-action/hooks`,
  and the result is `{ data, serverError, validationErrors }` — an action never throws
  across the boundary.

## TanStack Form

- v1 accepts **Standard Schema** validators directly: pass a Zod schema to
  `validators: { onChange: schema }`. The old `zodValidator` adapter package is gone.
- Fields are render-prop based (`<form.Field name="..." children={(field) => ...} />`),
  not the `register()` pattern from react-hook-form. Do not port react-hook-form idioms.

## TanStack Query

- v5 uses a **single object argument**: `useQuery({ queryKey, queryFn })`. The positional
  `useQuery(key, fn)` form is v4 and no longer valid.
- `isLoading` became `isPending`; `cacheTime` became `gcTime`.
- Server-side prefetch pairs `dehydrate()` in a Server Component with `HydrationBoundary`
  in the tree.

## nuqs

- Requires an adapter at the root: `NuqsAdapter` from `nuqs/adapters/next/app`.
- Parsers are explicit and composable: `parseAsInteger.withDefault(1)`,
  `parseAsArrayOf(parseAsString)`.
- `useQueryStates` batches multiple params into one history entry — use it instead of
  several `useQueryState` calls that would each push a navigation.

## motion

- The package is `motion`, the successor to `framer-motion`. React imports come from
  **`motion/react`** (`import { motion } from "motion/react"`), not from `framer-motion`
  and not from the bare `motion` root.

## Better Auth

- Server instance is `betterAuth({ ... })` in `lib/auth.ts`; the client is
  `createAuthClient()` from `better-auth/react`.
- Route handler is mounted via `toNextJsHandler(auth)` at `app/api/auth/[...all]/route.ts`.
- Session lookup on the server is `auth.api.getSession({ headers: await headers() })` —
  `headers()` is async in the current Next.js App Router.
- Schema is generated with the Better Auth CLI, then migrated through Drizzle.

## Next.js App Router

- `cookies()`, `headers()`, `params` and `searchParams` are **async** — always `await` them.
- `fetch` is no longer cached by default; opt in with `cache: "force-cache"` or
  `next: { revalidate }`.
- Caching semantics moved around across recent releases (`use cache`, Cache Components).
  Check the installed Next.js version before asserting anything about caching behavior.

## Zod

- v4 lives in the same `zod` package. Watch for renamed APIs: error customization uses a
  unified `error` parameter, and `z.string().email()` moved to top-level `z.email()`.
- Check whether the project is on v3 or v4 before writing schemas — the error handling
  differs enough to break code silently.

## Biome

- v2 config is `biome.json` (or `biome.jsonc`); the everyday command is
  `pnpm biome check --write .` — lint, format and import sorting in one pass.
- No ESLint or Prettier config files should exist in the repo. If you find one, that is a
  migration leftover to remove, not a signal to use them.
