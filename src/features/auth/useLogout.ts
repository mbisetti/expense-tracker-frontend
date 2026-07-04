import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { logout } from './api';
import { useAuth } from './useAuth';

export function useLogout() {
  const { setAccessToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    // onSettled: aunque el server falle (cookie ya vencida → 401), la sesión
    // local se limpia igual — el usuario pidió salir
    onSettled: () => {
      setAccessToken(null);
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}
