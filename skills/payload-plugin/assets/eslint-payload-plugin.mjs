// Managed by the keyes-dxp `payload-plugin` skill. Change the skill, then re-sync: never edit this copy.

// A plugin package: kebab-case files like the rest of the stack, PascalCase components.
export const payloadPlugin = [
  {
    files: ['src/**/*.tsx'],
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.tsx': 'PASCAL_CASE' },
        { ignoreMiddleExtensions: true },
      ],
    },
  },
]
