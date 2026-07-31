import { useMutation } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';

// Buzón de recomendaciones (S33): solo escritura. `context` dice de qué sección vino
// ("telegram-bot", "general"...) para poder leerlas agrupadas después.
export function useSendFeedback() {
  const http = useHttp();

  return useMutation<void, ApiError, { context: string; message: string }>({
    mutationFn: (body) => http<void>('/feedback', { method: 'POST', body: JSON.stringify(body) }),
  });
}
