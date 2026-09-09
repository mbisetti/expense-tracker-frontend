import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <div>Cargando...</div>;
  }
  // El server no contestó el refresh del arranque (red caída, deploy). No es "sin sesión":
  // AuthProvider reintenta solo y esto se va cuando conteste.
  if (status === 'unavailable') {
    return <div role="status">No pudimos conectar con el servidor. Reintentando...</div>;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
