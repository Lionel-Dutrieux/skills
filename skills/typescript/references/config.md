# Setting up or syncing the config

Read this when a project needs its lint, format, TypeScript or test config set up, or when
the user asks to sync it with the skills.

## Layers

Each skill ships a layer in its `assets/` folder; a project takes the layers of the skills
it uses. In a monorepo, `.config/keyes-dxp/` sits at the repo root and every app uses it,
and `.prettierignore` paths take the app's prefix (`apps/web/src/components/ui`).

### `typescript` — always

- **Copy to `.config/keyes-dxp/`**: `tsconfig.base.json`, `eslint-typescript.mjs`,
  `prettier.mjs`, `vitest.base.ts`, `playwright.base.ts`
- **Copy to the repo root**: `.editorconfig`, `.gitattributes`
- **Install**: `typescript@~6.0` `@types/node@^24` `eslint@^10` `typescript-eslint@^8`
  `eslint-plugin-check-file@^3` `eslint-config-prettier@^10` `prettier@^3` `vitest@^5`
  `@playwright/test@^1`
- **Add to `.prettierignore`**: `pnpm-lock.yaml`

### `react` — the project renders React

- **Copy to `.config/keyes-dxp/`**: `eslint-react.mjs` (from `react/assets/`)
- **Install**: `eslint-plugin-react-hooks@^7` `jsdom@^30` `@testing-library/react@^16`
  `@testing-library/dom@^10`
- **Add to `.prettierignore`**: `src/components/ui` — the shadcn CLI owns those files
- **In `components.json`**: `"aliases": { "hooks": "@/lib/hooks" }`

### `nextjs` — the project is a Next.js app

- **Copy to `.config/keyes-dxp/`**: `eslint-next.mjs` (from `nextjs/assets/`)
- **Install**: `eslint-config-next@^16` `@tanstack/eslint-plugin-query@^5`
  `babel-plugin-react-compiler@^1`
- `tsconfig.json` adds `"plugins": [{ "name": "next" }]` and Next's `include`
  (`next-env.d.ts`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts`). `vitest.setup.ts`
  holds `vi.mock('server-only', () => ({}))`. `next.config.ts` carries the settings the
  `nextjs` skill lists.

### `payload` — the project embeds Payload, or is a Payload plugin

- **Copy to `.config/keyes-dxp/`**: `eslint-payload.mjs` (from `payload/assets/`)
- **Add to `.prettierignore`**: `src/payload-types.ts`, `src/payload-generated-schema.ts`,
  `src/app/(payload)/admin/importMap.js`, `src/migrations` — Payload writes them
- `package.json` has `"type": "module"`. An app also gets the `@payload-config` path
  (`"./src/payload.config.ts"`) in `tsconfig.json`, and `withPayload(…)` as the outermost
  wrapper of `next.config.ts`. ESLint spreads `payload` in an app, `payloadPlugin` in a
  plugin package.

## Steps

1. **Copy each file of each layer with `cp`**, overwriting the previous copy. Retyping a
   file is how a rule silently changes.
2. **Install the packages** of the layers taken: `pnpm add -D <packages>`
   (`pnpm add -Dw` at the root of a monorepo).
3. **Wire the project's own files.** They belong to the project: create them if missing,
   and keep what is already project-specific (aliases, ignores, plugins). Drop from each
   snippet the layers the project does not take.
   - `eslint.config.mjs`, layers in dependency order:
     ```js
     import { defineConfig } from 'eslint/config'

     import { next } from './.config/keyes-dxp/eslint-next.mjs'
     import { react } from './.config/keyes-dxp/eslint-react.mjs'
     import { typescript } from './.config/keyes-dxp/eslint-typescript.mjs'

     export default defineConfig([
       { ignores: ['dist/', '.next/', 'next-env.d.ts'] },
       ...typescript,
       ...react,
       ...next,
     ])
     ```
   - `tsconfig.json`: `"extends": "./.config/keyes-dxp/tsconfig.base.json"`, plus the
     project's `paths` and `include`. TypeScript 6's defaults cover the module settings.
   - `package.json`: `"prettier": "./.config/keyes-dxp/prettier.mjs"`, and the scripts
     `lint` (`eslint .`), `format` (`prettier --write .`), `typecheck` (`tsc --noEmit`),
     `test:unit` (`vitest run --project unit`), `test:int` (`vitest run --project int`),
     `test:e2e` (`playwright test`).
   - `.prettierignore`: the lines listed by each layer.
   - `vitest.config.mts`:
     ```ts
     import { defineConfig, mergeConfig } from 'vitest/config'

     import { vitestBase } from './.config/keyes-dxp/vitest.base'

     export default mergeConfig(vitestBase, defineConfig({ test: { setupFiles: ['./vitest.setup.ts'] } }))
     ```
   - `playwright.config.ts`, against the production build as Next.js recommends:
     ```ts
     import { defineConfig } from '@playwright/test'

     import { playwrightBase } from './.config/keyes-dxp/playwright.base'

     export default defineConfig({
       ...playwrightBase,
       webServer: {
         command: 'pnpm build && pnpm start',
         url: 'http://localhost:3000',
         reuseExistingServer: true,
         timeout: 180_000,
       },
     })
     ```
4. **Run** `pnpm lint`, `pnpm typecheck` and `pnpm prettier --check .`.

Done when the three commands run. Errors they report in existing code go to the user
before any mass fix; on a re-sync, show the user `git diff .config/keyes-dxp`.
