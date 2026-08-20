import type { CapacitorConfig } from '@capacitor/cli';

// S44 — Configuración de la app nativa (Capacitor 8).
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// ⚠️  EL appId ES PROVISIONAL A PROPÓSITO Y NO SE PUEDE PUBLICAR ASÍ
// ─────────────────────────────────────────────────────────────────────────────────────────
// El package name de Google Play es **INMUTABLE post-publicación** (roadmap.md, riesgo #3):
// una vez que subís un AAB con este id, ese es el id de la app para siempre. Y el NOMBRE del
// producto sigue sin decidirse (es el bloqueador №1 del roadmap).
//
// Por eso el default dice literalmente `provisional`: es imposible publicar por accidente sin
// darse cuenta. Cuando caiga el NOMBRE, `npm run app:id -- com.elnombre.app` lo reescribe en
// los DIEZ lugares donde vive: este archivo, build.gradle (namespace y applicationId), los dos
// capacitor.config.json generados, strings.xml (package_name y custom_url_scheme), el
// project.pbxproj de Xcode, y el nombre del directorio del paquete de Java — que es el que
// nadie se acuerda y el único que además hay que MOVER, no editar.
// `npm run app:check-id` verifica que los diez coincidan.
const APP_ID = process.env.CAP_APP_ID ?? 'app.manguitos.provisional';
const APP_NAME = process.env.CAP_APP_NAME ?? 'Manguitos';

const config: CapacitorConfig = {
  appId: APP_ID,
  appName: APP_NAME,
  // El mismo `dist` que ya produce `npm run build`. La app nativa NO es otro build: es el
  // build de siempre empaquetado, que es todo el punto de haber elegido Capacitor.
  webDir: 'dist',
  // Mismo `surface` del design system (§1.2). Se ve el instante entre que el WebView existe
  // y que React pinta; si queda blanco puro, en dark mode es un flash blanco en la cara.
  backgroundColor: '#fafaf9',

  android: {
    backgroundColor: '#fafaf9',
  },

  ios: {
    backgroundColor: '#fafaf9',
    // El WebView no maneja los insets por su cuenta: los maneja el CSS de la app, que ya usa
    // safe areas desde S35 (AppLayout, Modal, UpdateToast).
    contentInset: 'never',
  },

  plugins: {
    // ── CapacitorHttp: APAGADO A PROPÓSITO ────────────────────────────────────────────────
    // Es el atajo típico para el problema de cookies de terceros en el WebView: parchea el
    // `fetch` global y las requests salen por la capa nativa, con el cookie jar del sistema.
    // Acá NO sirve: su implementación de `fetch` maneja mal `FormData` y `Blob`, y esta app
    // depende de las dos — `httpUpload` sube el .xlsx del import y el PDF del resumen, y
    // `httpBlob` baja los reportes del export (S26). Prenderlo rompe import y export a cambio
    // de arreglar el refresh.
    // La salida buena para el refresh es el token en storage seguro en vez de cookie, que
    // necesita backend. Está especificado entero en `docs/native.md` §3.
    CapacitorHttp: { enabled: false },
    CapacitorCookies: { enabled: false },

    SystemBars: {
      // Android 15+ fuerza edge-to-edge y `env(safe-area-inset-*)` no llega bien al WebView.
      // Con `css`, Capacitor inyecta `--safe-area-inset-*`; el puente a lo que ya usan los
      // componentes está en `index.css` (bloque S44).
      insetsHandling: 'css',
    },

    SplashScreen: {
      // No se auto-oculta: la esconde `bootstrapNative()` cuando React ya montó. Si se
      // ocultara sola por tiempo, se vería el hueco entre el splash y el primer render.
      launchAutoHide: false,
      backgroundColor: '#fafaf9',
      showSpinner: false,
    },

    Keyboard: {
      // El layout es scrolleable y mobile-first: que el teclado empuje el body mantiene el
      // input enfocado a la vista sin que cada form tenga que hacer scroll a mano.
      resize: 'body',
    },
  },
};

export default config;
