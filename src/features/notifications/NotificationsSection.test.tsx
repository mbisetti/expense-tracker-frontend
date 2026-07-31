import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { NotificationsSection } from './NotificationsSection';
import { jsonResponse } from '../../test/mockResponse';
import { selectOption } from '../../test/selectOption';
import type { NotificationPrefs } from './api';

const requests: { url: string; method?: string; body?: string }[] = [];

function stubFetch(handler: (url: string, options?: RequestInit) => Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      requests.push({ url, method: options?.method, body: options?.body as string | undefined });
      return handler(url, options);
    }),
  );
}

const PREFS: NotificationPrefs = {
  accumulationDays: 3,
  types: [
    {
      type: 'BOT_MOVEMENT',
      label: 'Movimientos que anota Vaqui',
      block: 'MOVEMENTS',
      inApp: true,
      telegram: false,
    },
    {
      type: 'BUDGET_EXCEEDED',
      label: 'Presupuesto excedido',
      block: 'ALERTS',
      inApp: true,
      telegram: false,
    },
  ],
};

function wrap(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: vi.fn() }}
      >
        <ToastProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  requests.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('NotificationsSection', () => {
  it('lista los tipos agrupados por bloque, con los dos canales', async () => {
    stubFetch(() => jsonResponse(200, PREFS));
    wrap(<NotificationsSection />);

    expect(await screen.findByText('Movimientos que anota Vaqui')).toBeInTheDocument();
    expect(screen.getByText('Presupuesto excedido')).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Movimientos que anota Vaqui, in-app' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('switch', { name: 'Movimientos que anota Vaqui, Telegram' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('prender Telegram manda el tipo entero en el PUT', async () => {
    stubFetch((_url, options) => {
      if (options?.method === 'PUT') {
        return jsonResponse(200, {
          ...PREFS,
          types: PREFS.types.map((t) =>
            t.type === 'BUDGET_EXCEEDED' ? { ...t, telegram: true } : t,
          ),
        });
      }
      return jsonResponse(200, PREFS);
    });
    wrap(<NotificationsSection />);

    fireEvent.click(await screen.findByRole('switch', { name: 'Presupuesto excedido, Telegram' }));

    await waitFor(() => expect(requests.some((r) => r.method === 'PUT')).toBe(true));
    const put = requests.find((r) => r.method === 'PUT');
    expect(JSON.parse(put?.body ?? '{}')).toEqual({
      types: { BUDGET_EXCEEDED: { inApp: true, telegram: true } },
    });
    expect(
      await screen.findByRole('switch', { name: 'Presupuesto excedido, Telegram' }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('cambiar los días de acumulación los manda solos', async () => {
    stubFetch((_url, options) => {
      if (options?.method === 'PUT') return jsonResponse(200, { ...PREFS, accumulationDays: 7 });
      return jsonResponse(200, PREFS);
    });
    wrap(<NotificationsSection />);

    await selectOption('Acumular notificaciones por', '7');

    await waitFor(() => expect(requests.some((r) => r.method === 'PUT')).toBe(true));
    const put = requests.find((r) => r.method === 'PUT');
    expect(JSON.parse(put?.body ?? '{}')).toEqual({ accumulationDays: 7 });
  });
});
