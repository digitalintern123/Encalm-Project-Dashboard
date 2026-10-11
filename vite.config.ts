import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Port can be overridden with PORT=4000 npm run dev, but it is not required.
const port = Number(process.env.PORT) || 5173;

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split vendor frameworks and heavy components into cached chunks
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'charts-vendor': ['recharts'],
          'icons-vendor': ['lucide-react'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
        },
      },
    },
  },
  server: {
    port,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 5000}`,
        changeOrigin: true,
      },
      '/uploads': {
        target: `http://localhost:${process.env.API_PORT || 5000}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: port + 1,
    host: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 5000}`,
        changeOrigin: true,
      },
      '/uploads': {
        target: `http://localhost:${process.env.API_PORT || 5000}`,
        changeOrigin: true,
      },
    },
  },
});
