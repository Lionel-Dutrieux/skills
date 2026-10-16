// Managed by the keyes-dxp `typescript` skill. Change the skill, then re-sync: never edit this copy.

import prettier from 'eslint-config-prettier/flat'
import checkFile from 'eslint-plugin-check-file'
import tseslint from 'typescript-eslint'

// A layer that restricts more extends these lists: a rule redeclared by a later layer
// replaces the earlier options instead of merging with them.
export const restrictedImportPaths = [
  { name: 'axios', message: 'Use the native fetch.' },
  { name: 'moment', message: 'Use date-fns.' },
  { name: 'dayjs', message: 'Use date-fns.' },
  { name: 'luxon', message: 'Use date-fns with @date-fns/tz.' },
]

export const restrictedSyntax = [
  {
    selector: 'ExportAllDeclaration',
    message: 'Export each name explicitly: barrels hide what a module really exposes.',
  },
]

export const typescript = [
  ...tseslint.configs.recommended,
  {
    plugins: { 'check-file': checkFile },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'func-style': ['error', 'expression'],
      'no-console': 'error',
      'no-restricted-exports': [
        'error',
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
      'no-restricted-imports': ['error', { paths: restrictedImportPaths }],
      'no-restricted-syntax': ['error', ...restrictedSyntax],
      'prefer-arrow-callback': 'error',
    },
  },
  {
    // TypeScript files only: a framework layer may parse JavaScript with its own parser.
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
  {
    // Tools load these files through their default export.
    files: ['**/*.config.{ts,mts,cts,js,mjs,cjs}', '.config/keyes-dxp/prettier.mjs'],
    rules: { 'no-restricted-exports': 'off' },
  },
  prettier,
]
