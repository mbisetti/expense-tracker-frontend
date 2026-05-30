import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { register, type RegisterRequest, type AuthResponse } from './api';
import { type ApiError } from '../../lib/http';
import { useAuth } from './useAuth';

export function useRegister() {
  const { setAccessToken } = useAuth();
  const navigate = useNavigate();

  return useMutation<AuthResponse, ApiError, RegisterRequest>({
    mutationFn: register,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      navigate('/accounts', { replace: true });
    },
  });
}
