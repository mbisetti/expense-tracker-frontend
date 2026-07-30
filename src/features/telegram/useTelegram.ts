import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { TelegramLinkStatus } from './api';

function useInvalidateTelegram() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['telegramLink'] });
}

export function useTelegramLink() {
  const http = useHttp();

  return useQuery({
    queryKey: ['telegramLink'],
    queryFn: () => http<TelegramLinkStatus>('/telegram/link'),
  });
}

export function useGenerateTelegramCode() {
  const http = useHttp();
  const invalidate = useInvalidateTelegram();

  return useMutation<TelegramLinkStatus, ApiError, void>({
    mutationFn: () => http<TelegramLinkStatus>('/telegram/link-code', { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function useUnlinkTelegram() {
  const http = useHttp();
  const invalidate = useInvalidateTelegram();

  return useMutation<void, ApiError, void>({
    mutationFn: () => http<void>('/telegram/link', { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
