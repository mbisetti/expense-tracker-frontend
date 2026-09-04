import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchMe, googleLogin, type GoogleLoginRequest, type AuthResponse } from './api';
import { type ApiError } from '../../lib/http';
import { redirectFrom } from './redirectState';
import { useAuth } from './useAuth';

// S25.1 — espejo de useLogin: mismo camino de éxito (guardar access token + redirect back).
// El refresh cookie ya viene seteado por el server, igual que login.
//
// S46 (D3) — el destino ya no es siempre /dashboard. /auth/google es find-or-create: la misma
// llamada puede ser un alta o el login de alguien que entra hace meses, y la respuesta (un
// access token pelado) no lo dice. Quien lo sabe es el perfil, así que se pide y se decide.
//
// La condición es `onboarded === false` y no `!onboarded` a propósito: si el perfil no se pudo
// leer, o lo devuelve un backend viejo sin el campo, el usuario va al dashboard. Errar para el
// lado de NO mandar a la guía a alguien que ya usa la app.
export function useGoogleLogin() {
  const { setAccessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const from = redirectFrom(location.state);

  return useMutation<AuthResponse, ApiError, GoogleLoginRequest>({
    mutationFn: googleLogin,
    onSuccess: async (data) => {
      setAccessToken(data.accessToken);
      let onboarded: boolean | undefined;
      try {
        const me = await fetchMe(data.accessToken);
        // De paso queda cacheado: la pantalla de destino no lo vuelve a pedir.
        queryClient.setQueryData(['me'], me);
        onboarded = me.onboarded;
      } catch {
        // Un perfil que no se pudo leer no es motivo para dejar al usuario sin destino.
      }
      // Fix del 2 Sep: el `from` se chequeaba ACÁ ARRIBA y cortaba antes de mirar `onboarded`,
      // así que una guía pendiente perdía contra cualquier destino guardado. Y ese destino no
      // sólo se anota al entrar a un link protegido: también al CERRAR SESIÓN. Te deslogueás
      // desde Gastos, entrás con una cuenta nueva de Google, y aterrizás en un Gastos vacío.
      //
      // La regla queda dicha en una línea: `from` sirve para devolver a alguien a donde estaba;
      // nunca para saltearle una guía que no hizo. Un usuario que YA la vio vuelve a su link.
      if (onboarded === false) {
        navigate('/onboarding', { replace: true });
        return;
      }
      navigate(from ?? '/dashboard', { replace: true });
    },
  });
}
