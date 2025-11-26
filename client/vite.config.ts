import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiProxyTarget =
  process.env.VITE_API_PROXY_TARGET ??
  process.env.VITE_APP_API_URL ??
  'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@client': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_PORT ?? 5173),
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: Number(process.env.VITE_PREVIEW_PORT ?? 4173),
  },
  build: {
    outDir: 'dist',
  },
});
