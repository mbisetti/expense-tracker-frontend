import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { login, type LoginRequest, type AuthResponse } from './api';
import { type ApiError } from '../../lib/http';
import { useAuth } from './useAuth';

export function useLogin() {
  const { setAccessToken } = useAuth();
  const navigate = useNavigate();

  return useMutation<AuthResponse, ApiError, LoginRequest>({
    mutationFn: login,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      navigate('/accounts', { replace: true });
    },
  });
}
