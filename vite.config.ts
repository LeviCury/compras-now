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
        // CRITICO: rotas de autenticacao e /api/me NUNCA podem ser cacheadas
        // (cookies de sessao mudam, tokens mudam, e cache de 401 quebra o
        // fluxo do AuthGate). NetworkOnly garante passagem direta ao server.
        navigateFallbackDenylist: [/^\/auth\//, /^\/api\/me/],
        // Garante que o SW novo assume controle imediato (sem precisar fechar
        // todas as tabs antigas). Combinado com `registerType: 'autoUpdate'`,
        // qualquer deploy entra em vigor sem Ctrl+Shift+R do user.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^\/auth\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/api\/me/,
            handler: 'NetworkOnly',
          },
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
            // StaleWhileRevalidate: serve do cache imediato (UX rapida) mas busca
            // versao nova em background. Combinado com cache busting via
            // capturedAt na URL, cada nova captura vira recurso novo no SW.
            urlPattern: /^\/api\/screenshot/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'screenshot-cache',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24,
                maxEntries: 40,
              },
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
