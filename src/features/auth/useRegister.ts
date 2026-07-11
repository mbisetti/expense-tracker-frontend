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
  // Default /accounts y no /dashboard: el usuario recién registrado no tiene
  // cuentas — el primer paso es crear una
  const from = redirectFrom(location.state) ?? '/accounts';

  return useMutation<AuthResponse, ApiError, RegisterRequest>({
    mutationFn: register,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      navigate(from, { replace: true });
    },
  });
}
