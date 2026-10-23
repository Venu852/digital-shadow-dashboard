import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The browser only calls relative /api URLs; in development Vite forwards them to the Flask server
    proxy: {
      '/api': 'http://127.0.0.1:5050',
    },
  },
  build: {
    outDir: 'dist',
  },
});
