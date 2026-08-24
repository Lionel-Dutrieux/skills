---
name: keyes-dxp-dotnet-react
description: Standard technology stack for the keyes-dxp team's ASP.NET Core (.NET 10) + React SPA applications, built on Microsoft's official "React and ASP.NET Core" template (Vite client project served by the .NET host). Consult BEFORE adding a dependency (pnpm add), choosing a library or technical approach, scaffolding a feature, or bootstrapping a project. Covers the React client: routing, styling, UI components, forms, validation, typed API access to the .NET backend, server state, URL/global state, tables, charts, i18n, dates, icons, animation, testing and linting.
---

# keyes-dxp ASP.NET Core + React SPA stack

The goal is uniformity: the same packages in every app, so any team member can move
between codebases without relearning. This document is the source of truth for
"which library do we use for X" **on the React client**.

Scope note: only the SPA side is standardised for now. The .NET side (project layout,
EF Core, identity, logging, etc.) is deliberately not covered yet — see
"Backend: not standardised yet" below.

## STOP — run this before writing code or adding a package

1. **Check the table below.** If the need is listed, use that library. No exceptions
   without asking the user.
2. **If the need is NOT listed**, do not pick one yourself — ask the user which library
   to use, then propose adding it to this skill.
3. **Before writing code with any library in this table**, read its installed version in
   `package.json`, then consult the current docs (context7 MCP if available, otherwise
   fetch the official docs). Several of these libraries changed their API after most
   model training cutoffs (Tailwind v4, TanStack Router / Form / Query, Zod v4, the
   shadcn/ui CLI). Do not write from memory.
4. **Never install what is already there.** Read `package.json` first; many of these ship
   transitively (`clsx`, `tailwind-merge` and `cmdk` come with shadcn/ui).
5. **Never touch the .NET project to solve a front-end problem** (or the reverse) without
   saying so explicitly.

## Project shape

Microsoft's official template produces two projects:

```
Solution.sln
  Xxx.Server/          # ASP.NET Core (.NET 10) — API + host of the built SPA
    Program.cs
    Xxx.Server.csproj  # references Microsoft.AspNetCore.SpaProxy
    wwwroot/           # receives the Vite build output on publish
  xxx.client/          # the React SPA
    xxx.client.esproj  # MSBuild wrapper so VS / dotnet build drive the package manager
    vite.config.ts     # dev proxy to the .NET server + HTTPS dev certificate
    package.json
    src/
```

In development the .NET host starts the Vite dev server through `SpaProxy`, and Vite
proxies `/api/...` to Kestrel. On publish the client build lands in `wwwroot` and is served
by the .NET app. Consequences you must respect:

- **Call the API with relative paths** (`/api/...`). Never hard-code
  `https://localhost:7xxx` in client code — the dev proxy and the single-origin production
  deployment both depend on relative URLs.
- **Add new proxied prefixes to `vite.config.ts`**, not to a bespoke client base URL.
- **The template's starter code goes.** Delete the sample `WeatherForecast` page and
  controller, the default CSS, and the ESLint config it ships with (we use Biome) as soon
  as real work starts.

Before scaffolding, confirm the exact template invocation with the user
(`dotnet new list react`, or Visual Studio's "React and ASP.NET Core") — the CLI template
ids have changed across .NET versions.

## Need → library

| Need | Use | Do NOT use |
|---|---|---|
| Package manager | `pnpm` | npm, yarn, bun |
| Client scaffold | Microsoft "React and ASP.NET Core" template (`.Server` + `.client`) | Create React App, a hand-wired webpack setup, the removed .NET 6/7 SPA templates |
| Build tool / dev server | Vite (as shipped by the template) | webpack, Parcel, hand-rolled esbuild scripts |
| Language | TypeScript, `strict: true` | JavaScript, `any` as an escape hatch |
| Routing | TanStack Router (file-based routes) | React Router, wouter, hand-rolled hash routing |
| Styling | Tailwind CSS v4, via `@tailwindcss/vite` | CSS modules, Sass, styled-components, the template's default CSS, Bootstrap |
| UI components | shadcn/ui | MUI, Chakra, Mantine, PrimeReact, hand-rolled equivalents |
| Conditional CSS classes | `cn()` (clsx + tailwind-merge, ships with shadcn/ui) | classnames, manual string concat |
| Icons | `lucide-react` | react-icons, heroicons, FontAwesome |
| Command palette | `cmdk`, through shadcn/ui's `Command` | kbar |
| Dark mode / theming | shadcn/ui's `ThemeProvider` from its **Vite** dark-mode guide (localStorage + class on `<html>`) | `next-themes` (its integration path is Next-specific), manual class toggling |
| Toasts / notifications | `sonner`, through shadcn/ui's `Sonner` | react-hot-toast, react-toastify |
| Animation | `motion` | framer-motion (the old name), react-spring, GSAP |
| Rich text rendering | `@tailwindcss/typography` (`prose` classes) | bespoke styles |
| Charts | shadcn/ui charts (Recharts-based) | Chart.js, victory, nivo, raw Recharts |
| Data tables | TanStack Table | ag-grid, MUI DataGrid, hand-rolled sorting/pagination |
| Large lists / virtualization | TanStack Virtual | react-window, react-virtualized |
| Drag & drop | dnd kit (`@dnd-kit/*`) | react-beautiful-dnd, react-dnd |
| Keyboard shortcuts | TanStack Hotkeys | react-hotkeys-hook |
| Debounce / throttle / rate limiting (client) | TanStack Pacer | use-debounce, lodash.debounce, hand-rolled setTimeout |
| Forms | TanStack Form, through the app's `useAppForm` (`references/forms.md`) | react-hook-form, Formik, raw `<form.Field>` in feature code |
| Validation | Zod | Yup, Joi, io-ts |
| API types from the .NET backend | `openapi-typescript`, generated from the server's OpenAPI document | hand-written interfaces, DTOs transcribed from C#, Kiota |
| HTTP requests | `openapi-fetch` (typed by the generated schema) | axios, ky, superagent, untyped `fetch` |
| Server state / caching | TanStack Query | SWR, Redux Toolkit Query, `useEffect` + fetch |
| Mutations | TanStack Query `useMutation` + cache invalidation | fetch calls inline in an event handler |
| URL state (filters, pagination, tabs) | TanStack Router typed search params (Zod `validateSearch`) | `useState` + manual `URLSearchParams`, `nuqs` |
| Global client state | `zustand` — rarely needed, see rules below | Redux, MobX, Jotai, React Context used as a store |
| Environment variables | `@t3-oss/env-core` over `import.meta.env` | reading `import.meta.env` directly, `process.env` |
| Auth on the client | the session cookie issued by the .NET backend (`credentials: "include"`) | JWTs in localStorage, a client-side auth library, Better Auth, Auth.js |
| i18n | `i18next` + `react-i18next` | react-intl, next-intl, hand-rolled translation files |
| Dates | `date-fns` | moment, dayjs, Luxon |
| Unit / integration tests | Vitest (`*.int.spec.ts` for integration) | Jest, Mocha, Karma |
| End-to-end tests | Playwright (`*.e2e.spec.ts`) | Cypress, Selenium, Puppeteer |
| Lint + format | Biome | ESLint, Prettier (remove the template's ESLint setup) |

## Hard rules

**The backend owns the contract.** Every API type comes from `openapi-typescript`
generating off the .NET OpenAPI document, wired as a `pnpm gen:api` script and re-run
whenever the server contract changes. Never re-declare a DTO by hand in TypeScript — a
manually maintained type silently drifts from the C# one and the compiler stops protecting
you.

**Generated types are compile-time only.** `openapi-fetch` gives you typing, not runtime
guarantees. Anything genuinely untrusted or outside the contract — form inputs, URL search
params, `localStorage`, `postMessage`, env vars, third-party payloads — is parsed by a Zod
schema before use. Infer TypeScript types from schemas (`z.infer`), never declare them twice.

**Authorization is enforced in the .NET app, always.** The SPA is public code: hiding a
button is UI, not security. Every endpoint checks the session and permissions server-side,
even when the client already prevents the call.

**No secrets in the client.** Everything under `import.meta.env.VITE_*` is baked into the
bundle and readable by anyone. API keys, connection strings and tokens live in the .NET
configuration, and the browser talks only to your own backend.

**Never edit anything in `components/ui/`.** Those files belong to the CLI:
`pnpm dlx shadcn@latest add <component>` writes them, and `add --overwrite` is how we pull
upstream fixes, accessibility patches and new variants. A local edit is silently lost on the
next upgrade — or, worse, freezes the app on an old version because nobody dares re-run the
CLI. Hand-writing a component shadcn/ui already provides is the same mistake.

Customize in this order instead:

1. **Theme tokens** — colors, radius, fonts in the Tailwind entry stylesheet (`src/index.css`, `@theme`). Fixes "it doesn't look like us"
   everywhere at once, and is exactly what the primitives read.
2. **Props at the call site** — the component's own `variant` / `size` props, plus a
   `className` (merged by `cn()`, so Tailwind conflicts resolve correctly).
3. **Your own wrapper**, outside `components/ui/`, composing the primitive and adding your
   defaults, behaviour or extra `cva` variants. This is where app-specific components live.
4. Only if none of the above can express it: fork the primitive into your own component with
   a new name, and say so explicitly. Never by mutating the file in `components/ui/`.

**Prefer server state to client state.** Most "state" in this app is the backend's data:
reach for TanStack Query first, then the URL (typed router search params), and only then a
store. Adding a `zustand` store is a decision you should be able to justify.

**Don't turn the SPA into a framework.** No SSR layer, no Next.js, no custom router layered
on top of TanStack Router. If a page genuinely needs server rendering, raise it with the
user — that is a stack decision, not an implementation detail.

## Conditional rules

- **zustand** → only for genuinely global, purely-UI client state (e.g. a complex editor
  shared across distant components). Not for server data, not for form state, not for
  filters. When in doubt, use TanStack Query or the URL instead.
- **Charts** → use the shadcn/ui chart components. Only drop to raw Recharts if the shadcn
  wrapper genuinely cannot express the chart, and say so explicitly.
- **i18n** → only install `i18next` once the app actually ships more than one locale. Don't
  pre-wrap every string "just in case".

## References

Read the relevant file before implementing — it contains the canonical code shapes.

| File | Read it when |
|---|---|
| `references/forms.md` | Building a form, a form field, or validating user input |

## Backend: not standardised yet

This skill does **not** yet prescribe the .NET side (project structure, EF Core, ASP.NET
Core Identity, minimal APIs vs controllers, validation, logging, testing). Until it does:

- Follow the conventions already present in the solution you are working in.
- If there are none, **ask the user** before choosing — then propose adding the decision here.
- The only cross-cutting requirement is the one above: the backend exposes an OpenAPI
  document (`Microsoft.AspNetCore.OpenApi` in .NET 10) that the client generates its types
  from.
