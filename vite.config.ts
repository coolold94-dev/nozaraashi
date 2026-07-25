import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'نوزراشى',
        short_name: 'نوزراشى',
        description: 'نظام إدارة سوبر ماركت جملة مصري — أوفلاين',
        theme_color: '#16a34a',
        background_color: '#f8fafc',
        display: 'standalone',
        dir: 'rtl',
        lang: 'ar',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
      },
    }),
  ],
});
