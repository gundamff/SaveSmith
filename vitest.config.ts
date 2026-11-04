import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  assetsInclude: ['**/*.wasm'],
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    // SQLCipher-heavy specs can exceed 5s when the full suite runs in parallel on slower machines.
    testTimeout: 15000
  },
  resolve: {
    alias: {
      '@sdk': path.resolve(__dirname, 'src/sdk'),
      '@host': path.resolve(__dirname, 'src/host'),
      '@games': path.resolve(__dirname, 'src/games')
    }
  }
})
