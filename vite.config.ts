import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';

/** Injects a <link rel="preload"> for the counselor avatar after Vite resolves its hash */
function preloadCounselorAvatarPlugin(): Plugin {
  let resolvedAvatarPath = '';
  return {
    name: 'preload-counselor-avatar',
    generateBundle(_options, bundle) {
      // Find the hashed asset filename for the counselor avatar
      for (const fileName of Object.keys(bundle)) {
        if (fileName.includes('counselor_avatar') && fileName.endsWith('.jpg')) {
          resolvedAvatarPath = fileName;
          break;
        }
      }
    },
    transformIndexHtml(html) {
      if (!resolvedAvatarPath) return html;
      const base = '/chat-light/';
      const preloadTag = `  <link rel="preload" as="image" href="${base}${resolvedAvatarPath}" fetchpriority="high">`;
      return html.replace('</head>', `${preloadTag}\n</head>`);
    }
  };
}

export default defineConfig(() => {
  return {
    // GitHub Pages deploys to https://<user>.github.io/chat-light/
    base: '/chat-light/',
    plugins: [
      react(), 
      tailwindcss(),
      preloadCounselorAvatarPlugin(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png', 'src/assets/images/counselor_avatar_1781520672657.jpg'],
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^.*\.(?:png|jpg|jpeg|svg|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        manifest: {
          name: '聊亮 ChatLight',
          short_name: '聊亮',
          description: '具備同理心與引導智慧的學習與身心卡點排除夥伴',
          theme_color: '#f5612c',
          background_color: '#faf4ee',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/chat-light/',
          scope: '/chat-light/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
