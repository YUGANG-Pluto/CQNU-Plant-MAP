import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'node20',
    outDir: 'main-dist/preload',
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    lib: {
      entry: 'electron/preload/index.ts',
      formats: ['cjs'],
      fileName: () => 'index.js'
    },
    rollupOptions: {
      external: ['electron'],
      output: {
        exports: 'named'
      }
    }
  }
});
