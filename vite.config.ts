import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Served from https://drafteame.github.io/draftea-momios-prototype/
  // — assets must be prefixed with the repo name so they resolve.
  base: '/draftea-momios-prototype/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
});
