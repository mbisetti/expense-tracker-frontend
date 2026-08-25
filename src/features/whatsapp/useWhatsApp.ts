import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { WhatsAppLinkStatus } from './api';

function useInvalidateWhatsApp() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['whatsappLink'] });
}

export function useWhatsAppLink() {
  const http = useHttp();

  return useQuery({
    queryKey: ['whatsappLink'],
    queryFn: () => http<WhatsAppLinkStatus>('/whatsapp/link'),
  });
}

export function useGenerateWhatsAppCode() {
  const http = useHttp();
  const invalidate = useInvalidateWhatsApp();

  return useMutation<WhatsAppLinkStatus, ApiError, void>({
    mutationFn: () => http<WhatsAppLinkStatus>('/whatsapp/link-code', { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function useUnlinkWhatsApp() {
  const http = useHttp();
  const invalidate = useInvalidateWhatsApp();

  return useMutation<void, ApiError, void>({
    mutationFn: () => http<void>('/whatsapp/link', { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
