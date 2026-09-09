import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: { include: ['tests/**/*.spec.ts'], environment: 'node' },
  resolve: {
    alias: {
      '@sdk': path.resolve(__dirname, 'src/sdk'),
      '@host': path.resolve(__dirname, 'src/host'),
      '@games': path.resolve(__dirname, 'src/games')
    }
  }
})
