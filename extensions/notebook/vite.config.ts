import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { OutputAsset } from 'rollup'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [svelte()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MatterVizNotebook',
      fileName: 'index',
      formats: ['es']
    },
    outDir: 'matterviz_notebook/static',
    emptyOutDir: true,
    rollupOptions: {
      external: [],
      output: {
        // Ensure CSS and JS are bundled together for anywidget
        assetFileNames: (assetInfo: OutputAsset) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'style.css'
          }
          return assetInfo.name || 'asset'
        }
      }
    },
    target: 'es2020',
    sourcemap: true
  },
  resolve: {
    alias: {
      '$lib': resolve(__dirname, '../../src/lib'),
      '$lib/*': resolve(__dirname, '../../src/lib/*')
    }
  },
  optimizeDeps: {
    include: ['three', 'd3-scale', 'svelte-multiselect', 'svelte-zoo']
  },
  define: {
    // Ensure VITEST is false for production builds to enable Canvas rendering
    'import.meta.env.VITEST': false
  }
})