import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The farmer app talks to the Grofunder API. In dev, requests to /api are
// proxied to the backend on :3000, so there are no CORS issues and the same
// code works unchanged in production (where /api is served by the same origin
// or an env-configured base URL).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
