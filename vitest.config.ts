import { defineConfig } from 'vitest/config';

// node 환경 — 순수 로직만 테스트하므로 canvas/jsdom 불필요 (docs/04-testing.md)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
