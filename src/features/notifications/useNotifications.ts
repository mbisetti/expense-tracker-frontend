import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { NotificationPrefs, NotificationsResponse, NotificationTypePref } from './api';

// El badge tiene que enterarse de lo que anota el bot mientras la app está abierta. Sin
// websockets en v1 (§Qué NO hace): refetch al volver a la pestaña + un poll suave.
const POLL_MS = 60_000;

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
}

export function useNotifications() {
  const http = useHttp();

  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => http<NotificationsResponse>('/notifications'),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const http = useHttp();
  const invalidate = useInvalidateNotifications();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const http = useHttp();
  const invalidate = useInvalidateNotifications();

  return useMutation<void, ApiError, void>({
    mutationFn: () => http<void>('/notifications/read-all', { method: 'POST' }),
    onSuccess: invalidate,
  });
}

export function useNotificationPrefs() {
  const http = useHttp();

  return useQuery({
    queryKey: ['notificationPrefs'],
    queryFn: () => http<NotificationPrefs>('/notification-prefs'),
  });
}

type PrefsUpdate = {
  accumulationDays?: number;
  types?: Record<string, { inApp: boolean; telegram: boolean }>;
};

export function useUpdateNotificationPrefs() {
  const http = useHttp();
  const queryClient = useQueryClient();

  return useMutation<NotificationPrefs, ApiError, PrefsUpdate>({
    mutationFn: (body) =>
      http<NotificationPrefs>('/notification-prefs', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    // La respuesta ES el estado nuevo completo: se escribe directo en la cache (sin refetch) y
    // se invalida el panel, que depende de los días de acumulación.
    onSuccess: (prefs) => {
      queryClient.setQueryData(['notificationPrefs'], prefs);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Helper de la grilla: el cambio de UN switch viaja como el tipo entero (los dos canales).
export function toggledChannels(
  pref: NotificationTypePref,
  channel: 'inApp' | 'telegram',
  value: boolean,
): Record<string, { inApp: boolean; telegram: boolean }> {
  return {
    [pref.type]: {
      inApp: channel === 'inApp' ? value : pref.inApp,
      telegram: channel === 'telegram' ? value : pref.telegram,
    },
  };
}
