import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration for the SINHS client.
 * Default export is required by Vite (allowed exception in AGENTS.md §12.3).
 * `/api` requests are proxied to the Express server, so the browser sees one origin and the
 * httpOnly auth cookie works without extra CORS setup.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
