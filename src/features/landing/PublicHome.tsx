import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

// Code-split la landing pública en su propio chunk: no queremos que el bundle anónimo
// (la primera carga de un visitante sin sesión) arrastre TanStack Query, el shell privado
// ni ningún hook de datos — LandingPage.tsx sólo importa components/ui/*, react-router
// `Link` y SVG inline, así el chunk queda liviano.
const LandingPage = lazy(() =>
  import('./LandingPage').then((module) => ({ default: module.LandingPage })),
);

// `/` es la home pública (S19): usuario autenticado -> /dashboard; anónimo -> landing.
// Mismo criterio de auth que ProtectedRoute.tsx (status === 'loading' | 'authenticated' |
// 'unauthenticated'), pero invertido: acá el estado "protegido" es quedarse en `/`.
export function PublicHome() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <div>Cargando...</div>;
  }
  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LandingPage />
    </Suspense>
  );
}
