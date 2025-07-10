import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '$lib': resolve(__dirname, '../../src/lib'),
      '$lib/*': resolve(__dirname, '../../src/lib/*')
    }
  },
  define: {
    'import.meta.env.VITEST': true
  }
})