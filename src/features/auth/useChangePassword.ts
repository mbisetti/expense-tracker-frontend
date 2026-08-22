import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';

// S25.4 (D1/D2/D3) — setear (cuenta solo-Google, con idToken) o cambiar (con currentPassword)
// la contraseña. El server revoca las otras sesiones y re-emite la cookie de ESTA, así que el
// usuario sigue adentro. La invalidación de ['me'] refresca hasPassword (false → true al crear).
export function useChangePassword() {
  const http = useHttp();
  const queryClient = useQueryClient();
  return useMutation<
    void,
    ApiError,
    { currentPassword?: string; idToken?: string; newPassword: string }
  >({
    mutationFn: (input) =>
      http<void>('/users/me/password', { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
