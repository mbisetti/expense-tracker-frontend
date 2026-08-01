import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './features/auth/AuthContext'
import { ToastProvider } from './components/ui/ToastProvider'
import { UpdateToast } from './components/UpdateToast'
import { AppRouter } from './router/AppRouter'
import { applyStoredTheme } from './lib/useTheme'
import { registerServiceWorker } from './lib/pwa'
import { listenForInstallPrompt } from './lib/useInstallPrompt'
import './index.css'

// Antes del render: aplica el tema guardado (si hay) para no flashear el del sistema.
applyStoredTheme()

// También antes del render: `beforeinstallprompt` puede llegar antes de que exista la
// pantalla de Ajustes, y en esa carga no se vuelve a disparar (S35).
listenForInstallPrompt()

// El service worker sólo existe en el build de producción (devOptions apagado): ni el dev
// server ni vitest registran nada.
if (import.meta.env.PROD) registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
          {/* Aviso de build nueva — global, también fuera de la sesión iniciada. */}
          <UpdateToast />
        </ToastProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
