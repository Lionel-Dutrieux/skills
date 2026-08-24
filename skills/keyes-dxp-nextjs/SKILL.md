---
name: keyes-dxp-nextjs
description: Use in a React/Next.js app — before adding a dependency or picking a library, when bootstrapping a project, writing a form, fetching data, writing a server action, touching auth, PayloadCMS or the database, writing tests, or growing the docs site. The keyes-dxp standard stack. For an ASP.NET Core backend serving a Vite SPA, use keyes-dxp-dotnet-react instead.
---

# keyes-dxp React/Next.js stack

The goal is uniformity: the same packages in every app, so any team member can move
between codebases without relearning. This document is the source of truth for
"which library do we use for X".

## STOP — run this before writing code or adding a package

1. **Check the table below.** If the need is listed, use that library. No exceptions
   without asking the user.
2. **If the need is NOT listed**, do not pick one yourself — ask the user which library
   to use, then propose adding it to this skill.
3. **Before writing code with any library in this table**, read its installed version in
   `package.json`, then consult the current docs (context7 MCP if available, otherwise
   fetch the official docs). Several of these libraries changed their API after most
   model training cutoffs — see `references/version-gotchas.md`. Do not write from memory.
4. **Never install what is already there.** Read `package.json` first; many of these ship
   transitively (`clsx`, `tailwind-merge` and `cmdk` come with shadcn/ui).

## Need → library

| Need | Use | Do NOT use |
|---|---|---|
| Package manager | `pnpm` | npm, yarn, bun |
| Styling | Tailwind CSS v4 | CSS modules, Sass, styled-components |
| UI components | shadcn/ui | MUI, Chakra, Mantine, hand-rolled equivalents |
| Conditional CSS classes | `cn()` (clsx + tailwind-merge, ships with shadcn/ui) | classnames, manual string concat |
| Icons | `lucide-react` | react-icons, heroicons |
| Command palette | `cmdk`, through shadcn/ui's `Command` | kbar |
| Dark mode / theming | `next-themes` (shadcn/ui installs it — follow its dark mode docs) | custom ThemeProvider, manual class toggling |
| Toasts / notifications | `sonner`, through shadcn/ui's `Sonner` | react-hot-toast, react-toastify |
| Animation | `motion` | framer-motion (the old name), react-spring, GSAP |
| Rich text rendering | `@tailwindcss/typography` (`prose` classes) | bespoke styles |
| Charts | shadcn/ui charts (Recharts-based) | Chart.js, victory, nivo, raw Recharts |
| Data tables | TanStack Table | ag-grid, MUI DataGrid, hand-rolled sorting/pagination |
| Large lists / virtualization | TanStack Virtual | react-window, react-virtualized |
| Drag & drop | dnd kit (`@dnd-kit/*`) | react-beautiful-dnd, react-dnd |
| Keyboard shortcuts | TanStack Hotkeys | react-hotkeys-hook |
| Debounce / throttle / rate limiting (client) | TanStack Pacer | use-debounce, lodash.debounce, hand-rolled setTimeout |
| Forms | TanStack Form | react-hook-form, Formik |
| Validation | Zod | Yup, Joi, class-validator |
| HTTP requests | native `fetch` (extended by Next.js on the server) | axios, ky, got, superagent |
| Server state / client-side fetching | TanStack Query | SWR, useEffect + fetch |
| Mutations | `next-safe-action` server actions | unvalidated hand-written actions |
| URL state (filters, pagination, tabs) | `nuqs` | useState + manual useSearchParams |
| Global client state | `zustand` — rarely needed, see rules below | Redux, MobX, Jotai |
| Environment variables | `@t3-oss/env-nextjs` | reading `process.env` directly |
| Authentication | Better Auth — unless PayloadCMS is present, see rules | next-auth / Auth.js, Clerk |
| CMS / backend | PayloadCMS, embedded in the Next.js app | Strapi, Contentful, Sanity |
| Database / ORM | Drizzle ORM (matches PayloadCMS's own layer) | Prisma, TypeORM, Kysely, raw SQL clients |
| i18n | `next-intl` | react-i18next, next-i18next |
| Dates | `date-fns` | moment, dayjs, Luxon |
| Email templates | `react-email` | hand-written HTML templates |
| Technical documentation | Fumadocs, **embedded in the Next.js app** (`content/docs/**`, a `(fumadocs)` route group) | Docusaurus, MkDocs, a separate docs app, a `docs/` folder of loose markdown, a Confluence page as the source of truth |
| AI / agents / LLM | Vercel AI SDK; chat UI → AI Elements | LangChain, hand-rolled LLM HTTP calls, custom chat UI |
| Multi-source file handling | Files SDK — rare, see rules below | custom storage abstraction layers |
| Unit / integration tests | Vitest (`*.int.spec.ts` for integration) | Jest, Mocha |
| End-to-end tests | Playwright (`*.e2e.spec.ts`) | Cypress, Selenium, Puppeteer |
| Lint + format | Biome | ESLint, Prettier |

## Hard rules

**Server actions are for mutations only.** Never use a server action to read data.
Reads happen in Server Components, or through route handlers consumed by TanStack Query
on the client. Every action goes through `next-safe-action` with a Zod `.inputSchema()`,
and anything touching sensitive data uses the `authActionClient` (a next-safe-action
client whose middleware verifies the session and permissions) — even when the UI already
hides the action from unauthorized users. Authorization is enforced server-side, always.
→ `references/server-actions.md`

**Parse every input at the boundary.** Anything crossing into your code — action inputs, route
handler bodies, search params, webhook payloads, env vars — goes through a Zod schema
before use. Infer TypeScript types from schemas (`z.infer`), never declare them twice.

**Treat `components/ui/` as CLI-owned, and customize around it.** Those files are written by
`pnpm dlx shadcn@latest add <component>` and re-fetched by `add --overwrite`, which is how the
app receives upstream fixes, accessibility patches and new variants. Keeping them pristine is
what keeps that upgrade path open; an edit made inside one is lost on the next `add`, or
freezes the app on an old version because nobody dares re-run the CLI.

Customize in this order:

1. **Theme tokens** — colors, radius, fonts in `app/globals.css` (`@theme`). Fixes "it doesn't look like us"
   everywhere at once, and is exactly what the primitives read.
2. **Props at the call site** — the component's own `variant` / `size` props, plus a
   `className` (merged by `cn()`, so Tailwind conflicts resolve correctly).
3. **Your own wrapper**, outside `components/ui/`, composing the primitive and adding your
   defaults, behaviour or extra `cva` variants. This is where app-specific components live.
4. Only if none of the above can express it: fork the primitive into your own component under
   a new name, and say so explicitly. The file in `components/ui/` stays untouched either way.

**Prefer the server.** In the App Router, most "state" is not client state. Reach for
Server Components first, then the URL (`nuqs`), then the TanStack Query cache. Adding a
`"use client"` directive or a store is a decision you should be able to justify.

## Conditional rules

- **PayloadCMS present** → use Payload's built-in auth. Do not install Better Auth.
  Payload's Postgres adapter is Drizzle under the hood, so the app's own tables live in
  the same Drizzle setup. → `references/auth-and-cms.md`, `references/database.md`
- **zustand** → only for genuinely global, purely-UI client state (e.g. a complex editor
  shared across distant components). Not for server data, not for form state, not for
  filters. When in doubt, use server state or the URL instead.
- **Files SDK** → only when the app juggles multiple file sources / storage backends. A
  plain upload does not justify it.
- **Charts** → use the shadcn/ui chart components. Only drop to raw Recharts if the
  shadcn wrapper genuinely cannot express the chart, and say so explicitly.
- **Fumadocs** → pages are MDX under `content/docs/**`; adding one never means touching the
  route under `src/app/(fumadocs)/`. `meta.json` both **orders and filters** the sidebar — a
  file missing from `pages[]` is invisible even though it builds, and a new sub-folder must be
  listed in its parent's `pages[]` too. Two rules govern the content: a concept is documented
  **once** and linked to elsewhere, and anything trivially derivable from the code or the types
  earns no page. If the repo ships its own docs-authoring skill, follow it — it wins over this
  paragraph.

## References

Read the relevant file before implementing — they contain the canonical code shapes.

| File | Read it when |
|---|---|
| `references/version-gotchas.md` | **Always**, before writing code with any of these libs |
| `references/new-project.md` | Bootstrapping an app, or adding a missing stack piece |
| `references/server-actions.md` | Writing any mutation |
| `references/data-fetching.md` | Fetching data, caching, route handlers, URL state |
| `references/forms.md` | Building a form, or validating input |
| `references/ui-styling.md` | Tailwind v4, shadcn/ui, theming, icons, charts, motion |
| `references/auth-and-cms.md` | Auth, sessions, permissions, PayloadCMS |
| `references/database.md` | Schema, queries, migrations |
| `references/testing.md` | Writing or running tests |
