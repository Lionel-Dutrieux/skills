// Managed by the keyes-dxp `payload` skill. Change the skill, then re-sync: never edit this copy.

// Payload's territory, named as Payload's official templates name it. Blocks are not in
// it: they follow the blocks plugin's kebab-case folders, as the rest of `src/` does.
const territory = ['collections', 'globals', 'fields', 'access', 'hooks', 'jobs']

const payloadNaming = {
  'check-file/filename-naming-convention': [
    'error',
    { '**/*.ts': 'CAMEL_CASE', '**/*.tsx': 'PASCAL_CASE' },
    { ignoreMiddleExtensions: true },
  ],
  // Collection and global folders are PascalCase (`collections/Posts/`).
  'check-file/folder-naming-convention': 'off',
}

// An app embedding Payload, or the CMS app of a headless repo.
export const payload = [
  {
    // Written by Payload's CLI, in its own style. Migrations keep the shape it generates.
    ignores: [
      'src/payload-types.ts',
      'src/payload-generated-schema.ts',
      'src/app/(payload)/admin/importMap.js',
      'src/migrations/',
    ],
  },
  {
    files: [`src/{${territory.join(',')}}/**`],
    rules: payloadNaming,
  },
]
