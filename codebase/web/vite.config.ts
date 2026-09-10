import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rawBase = process.env.VITE_BASE_PATH?.trim() ?? '';
const base = rawBase ? (rawBase.endsWith('/') ? rawBase : `${rawBase}/`) : '/';
const apiPrefix = rawBase ? `${rawBase.replace(/\/$/, '')}/api` : '/api';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      [apiPrefix]: {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(new RegExp(`^${apiPrefix}`), ''),
      },
    },
  },
});
