// Managed by the keyes-dxp `typescript` skill. Change the skill, then re-sync: never edit this copy.

import { defineConfig } from 'vitest/config'

export const vitestBase = defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.unit.spec.{ts,tsx}'],
        },
      },
      {
        // One file at a time: the files share one database, and a test that counts rows
        // would otherwise count what the file next door is writing.
        extends: true,
        test: {
          name: 'int',
          environment: 'node',
          include: ['tests/int/**/*.int.spec.{ts,tsx}'],
          fileParallelism: false,
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
})
