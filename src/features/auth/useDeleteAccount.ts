import { useMutation } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';

/**
 * Prueba de identidad para borrar la cuenta (S7). El backend exige la que corresponda según
 * cómo entró el usuario: contraseña si tiene, id token de Google si es Google-only.
 */
export type DeleteAccountProof = { password: string } | { idToken: string };

// Borra la propia cuenta (DELETE /users/me). El backend elimina el usuario y, por cascade,
// todos sus datos. El caller limpia la sesión y redirige.
//
// S7: ya no alcanza con el token de sesión. Sin prueba de identidad el server contesta 401
// REAUTH_REQUIRED, que NO es el 401 de sesión vencida: hay que mostrar "la contraseña no
// coincide" sin desloguear a nadie.
export function useDeleteAccount() {
  const http = useHttp();
  return useMutation<void, ApiError, DeleteAccountProof>({
    mutationFn: (proof) =>
      http<void>('/users/me', { method: 'DELETE', body: JSON.stringify(proof) }),
  });
}
