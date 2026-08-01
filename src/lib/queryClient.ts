import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './http'

// Hallazgo F1 — el QueryClient era el único componente de infraestructura del sistema sin una
// decisión escrita: `new QueryClient()` pelado heredaba toda la política de fábrica.
//
// Lo que se corrige: `retry: 3` sobre CUALQUIER error. Como http() lanza ApiError ante cualquier
// respuesta no-ok, un 404 o un 422 INSUFFICIENT_BALANCE se reintentaba tres veces con backoff
// exponencial. El backend contesta exactamente lo mismo las cuatro veces —son determinísticos—,
// así que el usuario esperaba ~7 segundos antes de ver el error. En useShares (al abrir el modal
// de reparto) y en useStatement (al abrir una tarjeta) eso se ve como que la app se colgó.
//
// Peor: ante un 401 irrecuperable, useHttp ya intentó un refresh y relanzó; los 3 reintentos de
// TanStack volvían a llamar a refreshAccessToken() cada vez. Cuatro POST /auth/refresh antes de
// redirigir a /login.
//
// Lo que NO se toca, a propósito: staleTime sigue en 0. Subirlo bajaría el tráfico, pero el
// proyecto tiene una postura explícita al respecto —"en una app de plata, un dato viejo mostrado
// como actual es peor que un error" (vite.config.ts, runtimeCaching del service worker)— y
// cambiarlo acá la contradiría en silencio. Es una decisión de producto, no una corrección.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // 4xx = determinístico: el server va a contestar lo mismo. Reintentar solo demora el
        // error que el usuario necesita ver.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        // 5xx y fallas de red sí pueden ser transitorias — dos reintentos, no tres.
        return failureCount < 2
      },
    },
    // Las mutaciones ya no reintentan por default en TanStack v5, y así tiene que quedar: un
    // POST /transactions reintentado es un gasto duplicado. Explícito para que un cambio de
    // default de la librería no lo altere sin que nadie lo note.
    mutations: {
      retry: false,
    },
  },
})
