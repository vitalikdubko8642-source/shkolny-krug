import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Vite собирает приложение, плагин PWA добавляет «манифест» и service worker —
// благодаря им сайт можно установить на телефон как приложение и открывать без интернета.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'profile-banners/*.webp', 'profile-bubbles/*.webp'],
      manifest: {
        name: 'Школьный круг',
        short_name: 'Школьный круг',
        description: 'Общение, идеи и события школы в квартале «Окла»',
        lang: 'ru',
        id: './',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3390EC',
        icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
})
