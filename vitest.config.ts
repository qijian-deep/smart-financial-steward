import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/**/*.ts'],
      exclude: ['src/**/*.test.ts']
    }
  }
})
