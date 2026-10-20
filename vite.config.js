import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173, watch: { ignored: ['**/Photos/**'] } },
  build: { assetsInlineLimit: 0, chunkSizeWarningLimit: 1200 },
});
