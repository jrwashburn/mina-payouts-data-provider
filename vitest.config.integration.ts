import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.integration.ts'],
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000, // Longer timeout for real database operations
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'tests/utils/fixtureCapture.ts',
      ],
    },
  },
});
