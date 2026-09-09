import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  test: { include: ['tests/**/*.spec.ts'], environment: 'node' },
  resolve: {
    alias: {
      '@sdk': path.resolve(__dirname, 'src/sdk'),
      '@host': path.resolve(__dirname, 'src/host'),
      '@games': path.resolve(__dirname, 'src/games')
    }
  }
})
