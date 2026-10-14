import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/scores': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    host: true,
  },
});
