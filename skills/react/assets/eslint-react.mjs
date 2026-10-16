// Managed by the keyes-dxp `react` skill. Change the skill, then re-sync: never edit this copy.

import reactHooks from 'eslint-plugin-react-hooks'

import {
  restrictedImportPaths as typescriptImportPaths,
  restrictedSyntax as typescriptSyntax,
} from './eslint-typescript.mjs'

const hooksConfig = reactHooks.configs.flat['recommended-latest']

export const restrictedImportPaths = [
  ...typescriptImportPaths,
  { name: 'framer-motion', message: "Use motion, imported from 'motion/react'." },
  { name: 'react-hook-form', message: 'Use useAppForm from @/components/form/form.' },
  { name: 'formik', message: 'Use useAppForm from @/components/form/form.' },
  { name: 'swr', message: 'Use TanStack Query.' },
  { name: 'zustand', message: 'Use TanStack Store (@tanstack/react-store).' },
  { name: 'clsx', message: "Use cn from 'cn'." },
  { name: 'tailwind-merge', message: "Use cn from 'cn'." },
  { name: 'classnames', message: "Use cn from 'cn'." },
  { name: 'react-icons', message: 'Use lucide-react.' },
  { name: '@dnd-kit/core', message: 'Use @dnd-kit/react.' },
  { name: 'recharts', message: "Use shadcn's chart components (ChartContainer)." },
  { name: 'cmdk', message: "Use shadcn's Command component." },
]

// Written by the shadcn CLI and re-fetched by `add --overwrite`: its style is not ours to fix,
// and it imports what it wraps (recharts, cmdk).
export const cliOwned = ['**/components/ui/**']

export const restrictedSyntax = [
  ...typescriptSyntax,
  {
    selector:
      'CallExpression[callee.name=/^(useMemo|useCallback|memo)$/], CallExpression[callee.property.name=/^(useMemo|useCallback|memo)$/]',
    message: 'React Compiler memoizes: write the plain value or function.',
  },
]

// The React Compiler rules, as opposed to the two classic rules of hooks.
const compilerRules = Object.keys(hooksConfig.rules).filter(
  (rule) => !['react-hooks/rules-of-hooks', 'react-hooks/exhaustive-deps'].includes(rule),
)

export const react = [
  hooksConfig,
  {
    rules: {
      'no-restricted-imports': ['error', { paths: restrictedImportPaths }],
      'no-restricted-syntax': ['error', ...restrictedSyntax],
    },
  },
  {
    files: cliOwned,
    rules: {
      ...Object.fromEntries(compilerRules.map((rule) => [rule, 'off'])),
      'func-style': 'off',
      'no-restricted-imports': ['error', { paths: typescriptImportPaths }],
      'no-restricted-syntax': ['error', ...typescriptSyntax],
      'prefer-arrow-callback': 'off',
    },
  },
]
