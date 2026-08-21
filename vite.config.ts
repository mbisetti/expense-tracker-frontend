import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const DESCRIPTION =
  'Maat: gastos, presupuestos, ingresos y transferencias multi-moneda en un solo lugar. Tus finanzas en orden.'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // S35 — PWA instalable. generateSW (Workbox) en vez de un SW artesanal: es deuda
    // gratuita mantener a mano el precache de un build hasheado (D2).
    VitePWA({
      registerType: 'prompt',
      // El registro lo hace `src/lib/pwa.ts` a mano (gated por PROD y con el chequeo
      // periódico de updates); sin esto el plugin inyectaría su propio script en el HTML.
      injectRegister: null,
      // Ni dev ni vitest ven un service worker.
      devOptions: { enabled: false },
      // Kill switch (D10): poner en true y deployar desregistra el SW y limpia sus caches
      // en cada visitante, sin pedirle nada al usuario. Volver la PWA a web común.
      selfDestroying: false,
      manifest: {
        // La identidad de la instalación es el id, NO el nombre (D1): cuando caiga la
        // decisión NOMBRE se cambian name/íconos y las instalaciones existentes se
        // actualizan solas, sin reinstalar.
        id: '/',
        name: 'Maat',
        short_name: 'Maat',
        lang: 'es',
        description: DESCRIPTION,
        // Instalada, la app abre en la app — no en la landing, que es material de browser
        // (D4). Sin sesión, ProtectedRoute manda a /login.
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        // Tema light: el manifest no tiene variante dark. En runtime manda la meta
        // theme-color dinámica (useTheme). Esto también nos da el splash de Android
        // gratis: fondo + ícono + nombre, cero arte nuevo (D5).
        theme_color: '#fafaf9',
        background_color: '#fafaf9',
        // `any` y `maskable` son entradas SEPARADAS (D6): marcar un mismo PNG como
        // "any maskable" hace que el recorte circular de los launchers coma el glifo.
        icons: [
          { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/pwa/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache del shell completo: JS/CSS hasheados, index.html, íconos y favicon.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        // Espejo exacto del fallback del backend (SpaWebConfig): /api/** nunca es una
        // ruta del router.
        navigateFallbackDenylist: [/^\/api\//],
        // CERO runtime caching a propósito: en una app de plata, un dato viejo mostrado
        // como actual es peor que un error. /api/** va SIEMPRE a la red.
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
