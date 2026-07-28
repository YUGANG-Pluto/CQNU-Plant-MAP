import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: {
    emptyOutDir: true,
    outDir: resolve(__dirname, 'renderer-dist'),
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'src/renderer-modern/main.tsx'),
      formats: ['iife'],
      name: 'CqnuModernRenderer',
      fileName: () => 'modern-shell.js',
      cssFileName: 'modern-shell'
    },
    rollupOptions: {
      output: {
        assetFileNames: assetInfo => (
          assetInfo.name?.endsWith('.css') ? 'modern-shell.css' : 'assets/[name][extname]'
        )
      }
    }
  }
});
