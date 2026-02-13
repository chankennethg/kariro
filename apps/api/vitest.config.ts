import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://kariro:kariro@localhost:5432/kariro_test',
      REDIS_URL: 'redis://localhost:6379',
      NODE_ENV: 'test',
      JWT_SECRET: 'DO-NOT-USE-IN-PRODUCTION-test-key-00000000',
    },
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
