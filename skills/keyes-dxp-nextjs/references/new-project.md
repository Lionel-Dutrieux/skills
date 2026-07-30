# Bootstrapping a project

Order matters — later steps assume earlier ones. Use it as a checklist when adding a
missing piece to an existing app too.

## 1. Scaffold

```bash
pnpm create next-app@latest my-app --typescript --tailwind --app --use-pnpm
cd my-app
```

`pnpm` only. If the repo contains a `package-lock.json` or `yarn.lock`, that is a mistake to
remove, not a signal to follow.

With PayloadCMS, start from the Payload Next.js template instead — it wires the admin UI,
the database adapter and the app router together correctly, which is tedious to retrofit.

## 2. Lint and format

```bash
pnpm add -D --save-exact @biomejs/biome
pnpm biome init
```

Delete any `.eslintrc*`, `eslint.config.*` and `.prettierrc*` the scaffold generated.
Everyday command: `pnpm biome check --write .`

## 3. Environment variables

```bash
pnpm add @t3-oss/env-nextjs zod
```

```ts
// env.ts
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
})
```

Import `env` everywhere. `process.env` appears only inside this file (and in
`drizzle.config.ts`, which runs outside the Next.js runtime). Commit a `.env.example`;
never commit `.env`.

## 4. UI layer

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label sonner
pnpm add lucide-react
```

`init` brings Tailwind v4 wiring, `cn()` in `lib/utils.ts`, `next-themes` and the CSS
tokens. Mount `<Toaster />` in the root layout.

## 5. Database

```bash
pnpm add drizzle-orm pg && pnpm add -D drizzle-kit @types/pg
```

Then `db/schema.ts`, `db/index.ts` and `drizzle.config.ts` — see `database.md`.

## 6. Auth

- PayloadCMS in the project → Payload's built-in auth, nothing to install.
- Otherwise → `pnpm add better-auth`, then `lib/auth.ts`, the catch-all route handler and
  the generated schema. See `auth-and-cms.md`.

## 7. Data and state

```bash
pnpm add @tanstack/react-query nuqs next-safe-action
```

Mount `QueryClientProvider` and `NuqsAdapter` in a `Providers` client component used by the
root layout, then create `lib/safe-action.ts` with `actionClient` and `authActionClient`
(see `server-actions.md`). Add TanStack Form, Table, Virtual, Pacer and Hotkeys when a
feature actually needs them — not upfront.

## 8. Testing

```bash
pnpm add -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom \
  @testing-library/react @testing-library/jest-dom
pnpm create playwright
```

Config and conventions in `testing.md`.

## 9. i18n, when the app is multilingual

```bash
pnpm add next-intl
```

Set it up before writing UI. Retrofitting locale routing across an existing app is far more
work than doing it on day one. Even in a single-locale app, keep user-facing strings out of
JSX conditionals so the retrofit stays possible.

## Recommended layout

```
app/                    # routes, layouts, route handlers
components/
  ui/                   # shadcn/ui primitives — generated, editable, not hand-written
components/             # shared app components
features/<feature>/     # schema.ts, actions.ts, queries.ts, components/
db/                     # schema.ts, index.ts
lib/                    # auth.ts, safe-action.ts, utils.ts
env.ts
```

Colocate by feature. A file used by exactly one feature lives in that feature's folder, not
in a global `components/` or `utils/` dumping ground.

## Definition of done

- [ ] `pnpm biome check .` is clean
- [ ] `pnpm tsc --noEmit` is clean — no `any`, no `@ts-ignore` without a comment explaining why
- [ ] Every server action uses `next-safe-action` with an `.inputSchema()`
- [ ] Every sensitive action and route handler re-checks authorization server-side
- [ ] No `process.env` outside `env.ts`
- [ ] No dependency added that is not in the stack table, or the user approved it explicitly
