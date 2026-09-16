import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/public-site': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/public-site/, '/site')
      },

      '/assets': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },

      '/legacy-assets': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});