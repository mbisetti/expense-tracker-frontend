import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { googleLogin, type GoogleLoginRequest, type AuthResponse } from './api';
import { type ApiError } from '../../lib/http';
import { redirectFrom } from './redirectState';
import { useAuth } from './useAuth';

// S25.1 — espejo de useLogin: mismo camino de éxito (guardar access token + redirect back).
// El refresh cookie ya viene seteado por el server, igual que login. find-or-create → siempre /dashboard.
export function useGoogleLogin() {
  const { setAccessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = redirectFrom(location.state) ?? '/dashboard';

  return useMutation<AuthResponse, ApiError, GoogleLoginRequest>({
    mutationFn: googleLogin,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      navigate(from, { replace: true });
    },
  });
}
