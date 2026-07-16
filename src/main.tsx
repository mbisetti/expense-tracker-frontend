import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './features/auth/AuthContext'
import { ToastProvider } from './components/ui/ToastProvider'
import { AppRouter } from './router/AppRouter'
import { applyStoredTheme } from './lib/useTheme'
import './index.css'

// Antes del render: aplica el tema guardado (si hay) para no flashear el del sistema.
applyStoredTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)