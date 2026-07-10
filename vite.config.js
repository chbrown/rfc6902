import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: '.',
    emptyOutDir: false,
    lib: {
      entry: './app.js',
      formats: ['iife'],
      name: 'app',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'bundle.min.js',
        assetFileNames: ({ name }) => name?.endsWith('.css') ? 'site.css' : name,
      },
    },
  },
})
