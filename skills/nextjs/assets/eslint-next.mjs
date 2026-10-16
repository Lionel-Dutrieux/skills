// Managed by the keyes-dxp `nextjs` skill. Change the skill, then re-sync: never edit this copy.

import pluginQuery from '@tanstack/eslint-plugin-query'
import nextVitals from 'eslint-config-next/core-web-vitals'
import tseslint from 'typescript-eslint'

import { cliOwned, restrictedImportPaths as reactImportPaths } from './eslint-react.mjs'

export const restrictedImportPaths = [
  ...reactImportPaths,
  { name: 'next/router', message: "Use 'next/navigation': this is the App Router." },
]

// Files Next.js loads through their default export.
const nextEntryFiles = [
  'page',
  'layout',
  'template',
  'loading',
  'error',
  'global-error',
  'not-found',
  'global-not-found',
  'default',
  'icon',
  'apple-icon',
  'opengraph-image',
  'twitter-image',
  'sitemap',
  'robots',
  'manifest',
]

export const next = [
  ...nextVitals,
  ...pluginQuery.configs['flat/recommended'],
  {
    // eslint-config-next gives the TypeScript parser to .ts and .tsx only.
    files: ['**/*.{mts,cts}'],
    languageOptions: { parser: tseslint.parser },
  },
  {
    rules: {
      'check-file/folder-naming-convention': [
        'error',
        { 'src/app/**/': 'NEXT_JS_APP_ROUTER_CASE', 'src/!(app)/**/': 'KEBAB_CASE' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Read env vars through `env` from @/env.' },
      ],
    },
  },
  {
    ignores: cliOwned,
    rules: { 'no-restricted-imports': ['error', { paths: restrictedImportPaths }] },
  },
  {
    files: [`src/app/**/{${nextEntryFiles.join(',')}}.{ts,tsx}`, 'src/i18n/request.ts'],
    rules: { 'no-restricted-exports': 'off' },
  },
  {
    // Where env vars are allowed to be read: the env schema, the runtime switch, the configs.
    files: ['src/env.ts', 'src/instrumentation.ts', '**/*.config.*', '.config/**'],
    rules: { 'no-restricted-properties': 'off' },
  },
]
