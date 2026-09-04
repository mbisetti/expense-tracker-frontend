import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { register, type RegisterRequest, type AuthResponse } from './api';
import { type ApiError } from '../../lib/http';
import { useAuth } from './useAuth';

export function useRegister() {
  const { setAccessToken } = useAuth();
  const navigate = useNavigate();
  // S46 (D3): el destino del alta es la guía. Antes era /accounts, que al menos tenía un empty
  // state con CTA; ahora los dos registros (email y Google) aterrizan en el mismo lugar, y ese
  // lugar explica la app cargando los datos del usuario en vez de dejarlo frente a una pantalla
  // vacía.
  //
  // Fix del 2 Sep: acá `redirectFrom` ganaba, con el argumento de "venías de un link protegido".
  // El problema es que ese destino TAMBIÉN se anota al cerrar sesión: te deslogueás desde Gastos,
  // te creás una cuenta nueva, y aterrizás en un Gastos que no tiene nada tuyo. Una cuenta recién
  // creada no tiene a dónde volver, así que el redirect no aplica y la guía gana siempre. De paso
  // los dos caminos de alta vuelven a coincidir: useGoogleLogin ya ignoraba el redirect y decidía
  // por `onboarded`.
  const from = '/onboarding';

  return useMutation<AuthResponse, ApiError, RegisterRequest>({
    mutationFn: register,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      navigate(from, { replace: true });
    },
  });
}
