import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration for the SINHS client.
 * Default export is required by Vite (allowed exception in AGENTS.md §12.3).
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
