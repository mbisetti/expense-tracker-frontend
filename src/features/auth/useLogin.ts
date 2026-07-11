import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { login, type LoginRequest, type AuthResponse } from './api';
import { type ApiError } from '../../lib/http';
import { redirectFrom } from './redirectState';
import { useAuth } from './useAuth';

export function useLogin() {
  const { setAccessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = redirectFrom(location.state) ?? '/dashboard';

  return useMutation<AuthResponse, ApiError, LoginRequest>({
    mutationFn: login,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      navigate(from, { replace: true });
    },
  });
}
