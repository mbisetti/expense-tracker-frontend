import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { register, type RegisterRequest, type AuthResponse } from './api';
import { type ApiError } from '../../lib/http';
import { redirectFrom } from './redirectState';
import { useAuth } from './useAuth';

export function useRegister() {
  const { setAccessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // S46 (D3): el destino del alta es la guía. Antes era /accounts, que al menos tenía un empty
  // state con CTA; ahora los dos registros (email y Google) aterrizan en el mismo lugar, y ese
  // lugar explica la app cargando los datos del usuario en vez de dejarlo frente a una pantalla
  // vacía. `redirectFrom` (venías de un link protegido) sigue ganando.
  const from = redirectFrom(location.state) ?? '/onboarding';

  return useMutation<AuthResponse, ApiError, RegisterRequest>({
    mutationFn: register,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      navigate(from, { replace: true });
    },
  });
}
