---
name: keyes-dxp-dotnet-react
description: Use in an ASP.NET Core (.NET 10) solution serving a React SPA — before adding a dependency or picking a library, when bootstrapping the solution, writing a form, calling or regenerating the API client, writing an endpoint or a background job, writing tests, or growing the docs site. The keyes-dxp standard stack for both sides of the wire. For a Next.js app, use keyes-dxp-nextjs instead.
---

# keyes-dxp ASP.NET Core + React SPA stack

The goal is uniformity: the same packages in every app, so any team member can move
between codebases without relearning. This document is the source of truth for
"which library do we use for X", on both sides of the wire.

Two tables below: **the React client** first, **the ASP.NET Core backend** second. The
solution's project layout is the one thing still left open — see the note under the backend
table.

## STOP — run this before writing code or adding a package

1. **Check the table below** (or `references/backend.md` when the work is server-side). If the
   need is listed, use that library. No exceptions without asking the user.
2. **If the need is NOT listed**, do not pick one yourself — ask the user which library
   to use, then propose adding it to this skill.
3. **Before writing code with any library in this table**, read its installed version in
   `package.json`, then consult the current docs (context7 MCP if available, otherwise
   fetch the official docs). Several of these libraries changed their API after most
   model training cutoffs (Tailwind v4, TanStack Router / Form / Query, Zod v4, the
   shadcn/ui CLI). Do not write from memory.
4. **Never install what is already there.** Read `package.json` / the `.csproj` files first;
   many front-end packages ship transitively (`clsx`, `tailwind-merge` and `cmdk` come with
   shadcn/ui), and `Directory.Build.props` may already carry what you were about to add.
5. **Change the C# contract and the generated client in the same commit.** They are one
   change — see `references/api-contract.md`.

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
- **Map an `/api/{**rest}` catch-all *before* `MapFallbackToFile`.** Without it an unknown API
  route answers `index.html` with a 200, and the SPA parses HTML as JSON somewhere far from
  the cause.
- **The template's starter code goes.** Delete the sample `WeatherForecast` page and
  controller, the default CSS, and the ESLint config it ships with (we use Biome) as soon
  as real work starts.

A solution that outgrew the template keeps the same invariants with a different layout — in
`Keyes-CSP` the SPA lives in `web/portal-spa/` next to `src/Portal.*/`, and the WebApi still
serves it from `wwwroot` with the fallback rule above. Follow the layout already in place; do
not re-shape an existing solution to match the template.

Before scaffolding a new one, confirm the exact template invocation with the user
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
| Styling | Tailwind CSS v4, via `@tailwindcss/vite` | CSS modules, Sass, the template's default CSS |
| UI components | shadcn/ui | MUI, Mantine, hand-rolled equivalents |
| Conditional CSS classes | `cn()` (clsx + tailwind-merge, ships with shadcn/ui) | classnames, manual string concat |
| Icons | `lucide-react` | react-icons, heroicons |
| Command palette | `cmdk`, through shadcn/ui's `Command` | kbar |
| Dark mode / theming | `next-themes` — despite the name it is framework-agnostic and works in a Vite SPA | manual class toggling, a hand-rolled ThemeProvider |
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
| Validation | Zod — generated by orval from the contract wherever the shape is already described there (`references/api-contract.md`) | Yup, Joi, io-ts, retyping by hand a schema the OpenAPI document already carries |
| API client (types + hooks) | `orval`, generating a TanStack Query client from the .NET OpenAPI document (`references/api-contract.md`) | hand-written interfaces, DTOs transcribed from C#, Kiota, openapi-fetch alone |
| HTTP layer | one hand-written orval `mutator` (`src/api/http-client.ts`) | axios, a `fetch` call written in a component |
| Server state / caching | TanStack Query, through the hooks orval generates | SWR, Redux Toolkit Query, `useEffect` + fetch, hand-written `useQuery` over a generated endpoint |
| Mutations | the generated `useMutation` hook + cache invalidation | fetch calls inline in an event handler |
| URL state (filters, pagination, tabs) | TanStack Router typed search params (Zod `validateSearch`) | `useState` + manual `URLSearchParams`, `nuqs` |
| Global client state | `zustand` — rarely needed, see rules below | Redux, MobX, Jotai, React Context used as a store |
| Environment variables | `@t3-oss/env-core` over `import.meta.env` | reading `import.meta.env` directly, `process.env` |
| Authentication | Entra ID via `@azure/msal-browser` + `@azure/msal-react`; the bearer token is attached by the mutator | JWTs in localStorage, Better Auth, Auth.js, a hand-rolled login against a self-issued token |
| Break-glass / local account | an HttpOnly + SameSite=Strict + Secure cookie scheme on the .NET side | a second self-issued JWT, a shared password in configuration |
| i18n | `i18next` + `react-i18next` | react-intl, next-intl, hand-rolled translation files |
| Dates | `date-fns` | moment, dayjs, Luxon |
| Unit / integration tests | Vitest (`*.int.spec.ts` for integration) | Jest, Mocha, Karma |
| End-to-end tests | Playwright (`*.e2e.spec.ts`) | Cypress, Selenium, Puppeteer |
| Lint + format | Biome (`biome check`) | ESLint, Prettier, oxlint, or any second linter running alongside |
| Technical documentation | Fumadocs, in **its own Next.js project** beside the SPA (`web/<app>-docs`) — `references/documentation.md` | Docusaurus, MkDocs, MDX bolted onto the Vite SPA, a `docs/` folder of loose markdown, a hand-maintained HTML page |

## Hard rules

**The backend owns the contract.** Types *and* query hooks are generated by `orval` from the
OpenAPI document the WebApi produces. Never re-declare a DTO by hand in TypeScript, never
hand-write a `useQuery` over a generated endpoint — both drift from C# within weeks, and the
drift surfaces in production as a silently missing field. The generated client is committed,
and a drift check fails the pipeline when it is stale. → `references/api-contract.md`

**Every error is a `ProblemDetails`.** The API answers RFC 7807 on every non-2xx, carrying a
stable `errorCode` extension. The mutator normalises it into a single `ApiError` type, so no
component ever inspects a raw `Response`. The `detail` string is a human sentence for
diagnostics — the UI translates the code, and falls back to `detail` only for a code this
build does not know.

**Generated types are compile-time only.** They give you typing, not runtime guarantees.
Anything genuinely untrusted or outside the contract — form inputs, URL search params,
`localStorage`, `postMessage`, env vars, third-party payloads — is parsed by a Zod schema
before use. Infer TypeScript types from schemas (`z.infer`), never declare them twice.

**Authorization is enforced in the .NET app, always.** The SPA is public code: hiding a
button is UI, not security. Every endpoint re-evaluates permissions on every request, even
when the client already prevents the call. What the SPA computes from the current user —
which menu entries show, which route redirects — is a display convenience, and the code
should say so where it is written.

**Secrets live in the .NET configuration.** Everything under `import.meta.env.VITE_*` is baked
into the bundle and readable by anyone, so API keys, connection strings and tokens stay
server-side and the browser talks only to your own backend.

**Treat `components/ui/` as CLI-owned, and customize around it.** Those files are written by
`pnpm dlx shadcn@latest add <component>` and re-fetched by `add --overwrite`, which is how the
app receives upstream fixes, accessibility patches and new variants. Keeping them pristine is
what keeps that upgrade path open; an edit made inside one is lost on the next `add`, or
freezes the app on an old version because nobody dares re-run the CLI.

Customize in this order:

1. **Theme tokens** — colors, radius, fonts in the Tailwind entry stylesheet (`src/index.css`, `@theme`). Fixes "it doesn't look like us"
   everywhere at once, and is exactly what the primitives read.
2. **Props at the call site** — the component's own `variant` / `size` props, plus a
   `className` (merged by `cn()`, so Tailwind conflicts resolve correctly).
3. **Your own wrapper**, outside `components/ui/`, composing the primitive and adding your
   defaults, behaviour or extra `cva` variants. This is where app-specific components live.
4. Only if none of the above can express it: fork the primitive into your own component under
   a new name, and say so explicitly. The file in `components/ui/` stays untouched either way.

**Prefer server state to client state.** Most "state" in this app is the backend's data:
reach for TanStack Query first, then the URL (typed router search params), and only then a
store. Adding a `zustand` store is a decision you should be able to justify.

**The SPA stays a SPA.** TanStack Router is the whole routing story, and rendering happens in
the browser. If a page genuinely needs server rendering, raise it with the user: that is a
stack decision, not an implementation detail.

## Working on the .NET side

The backend table and its hard rules live in `references/backend.md` — minimal APIs, EF Core 10,
Hangfire, Microsoft.Identity.Web, FluentValidation, testing, and the invariants that go with
them (no schema created at startup, reads are projections, environment guards are allowlists).
Read it before writing C#.

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
| `references/api-contract.md` | Calling the API, regenerating the client, handling errors |
| `references/backend.md` | Writing anything in C#: endpoints, persistence, jobs, auth, tests |
| `references/documentation.md` | Writing or growing the documentation site |
| `references/forms.md` | Building a form, a form field, or validating user input |
