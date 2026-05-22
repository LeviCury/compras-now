import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/icon.png'],
      manifest: {
        name: 'Compras Now Executivo',
        short_name: 'Compras Now Exec',
        description: 'Painel executivo de compras de gado - Minerva Foods',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/favicon.png',
            sizes: '64x64',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^\/api\/snapshot(\?|$)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'snapshot-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 60 * 5 },
            },
          },
          {
            urlPattern: /^\/api\/snapshots(\?|$)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'snapshots-all-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 60 * 10 },
            },
          },
          {
            urlPattern: /^\/api\/intraday(\?|$)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'intraday-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 60 * 10 },
            },
          },
          {
            urlPattern: /^\/api\/screenshot/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'screenshot-cache',
              expiration: { maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          recharts: ['recharts'],
          pdf: ['jspdf', 'html2canvas'],
        },
      },
    },
  },
});
