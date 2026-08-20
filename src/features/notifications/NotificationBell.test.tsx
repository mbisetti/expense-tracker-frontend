import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthContext } from '../auth/context';
import { runBackInterceptors } from '../../lib/nativeBack';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { NotificationBell } from './NotificationBell';
import { jsonResponse } from '../../test/mockResponse';
import type { NotificationItem, NotificationsResponse } from './api';

const requests: { url: string; method?: string }[] = [];

function stubFetch(handler: (url: string, options?: RequestInit) => Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      requests.push({ url, method: options?.method });
      return handler(url, options);
    }),
  );
}

function item(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'n1',
    type: 'BOT_MOVEMENT',
    title: 'Vaqui anotó $20.000 · nafta',
    body: 'Efectivo · Transporte',
    targetType: 'TRANSACTION',
    targetId: 'tx-1',
    createdAt: new Date().toISOString(),
    read: false,
    ...overrides,
  };
}

function payload(overrides: Partial<NotificationsResponse> = {}): NotificationsResponse {
  return {
    unreadCount: 0,
    accumulationDays: 3,
    movements: { recent: [], older: [], unreadCount: 0 },
    alerts: { recent: [], older: [], unreadCount: 0 },
    ...overrides,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

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
          <MemoryRouter>
            {children}
            <LocationProbe />
          </MemoryRouter>
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

describe('NotificationBell', () => {
  it('el badge cuenta las no leídas y lo dice en el aria-label', async () => {
    stubFetch(() =>
      jsonResponse(
        200,
        payload({ unreadCount: 3, movements: { recent: [item()], older: [], unreadCount: 1 } }),
      ),
    );
    wrap(<NotificationBell />);

    expect(await screen.findByRole('button', { name: 'Notificaciones, 3 sin leer' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('sin no leídas no muestra badge', async () => {
    stubFetch(() => jsonResponse(200, payload()));
    wrap(<NotificationBell />);

    expect(await screen.findByRole('button', { name: 'Notificaciones' })).toBeInTheDocument();
  });

  it('abre el panel con los dos bloques', async () => {
    stubFetch(() =>
      jsonResponse(
        200,
        payload({
          unreadCount: 2,
          movements: { recent: [item()], older: [], unreadCount: 1 },
          alerts: {
            recent: [
              item({
                id: 'n2',
                type: 'BUDGET_EXCEEDED',
                title: 'Te pasaste en Comida',
                body: null,
                targetType: 'BUDGETS',
                targetId: 'b1',
              }),
            ],
            older: [],
            unreadCount: 1,
          },
        }),
      ),
    );
    wrap(<NotificationBell />);

    fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones, 2 sin leer' }));

    expect(await screen.findByRole('dialog', { name: 'Notificaciones' })).toBeInTheDocument();
    expect(screen.getByText('Movimientos')).toBeInTheDocument();
    expect(screen.getByText('Alertas')).toBeInTheDocument();
    expect(screen.getByText('Vaqui anotó $20.000 · nafta')).toBeInTheDocument();
    expect(screen.getByText('Te pasaste en Comida')).toBeInTheDocument();
  });

  it('sin nada muestra el estado vacío', async () => {
    stubFetch(() => jsonResponse(200, payload()));
    wrap(<NotificationBell />);

    fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones' }));

    expect(await screen.findByText('Todavía no hay nada por acá.')).toBeInTheDocument();
  });

  // D4: lo viejo y visto entra colapsado y se expande en el mismo panel.
  it('las anteriores se colapsan y se expanden', async () => {
    stubFetch(() =>
      jsonResponse(
        200,
        payload({
          movements: {
            recent: [item()],
            older: [item({ id: 'n9', title: 'Vaqui anotó $500 · cafe', read: true })],
            unreadCount: 1,
          },
        }),
      ),
    );
    wrap(<NotificationBell />);

    fireEvent.click(await screen.findByRole('button', { name: /Notificaciones/ }));
    expect(screen.queryByText('Vaqui anotó $500 · cafe')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '+ 1 anterior' }));

    expect(screen.getByText('Vaqui anotó $500 · cafe')).toBeInTheDocument();
  });

  // D3: abrir = marcar leída + ir al editor de la transacción.
  it('tocar un movimiento del bot lo marca leído y abre la tx para editar', async () => {
    stubFetch((_url, options) => {
      if (options?.method === 'POST') return jsonResponse(204);
      return jsonResponse(
        200,
        payload({ unreadCount: 1, movements: { recent: [item()], older: [], unreadCount: 1 } }),
      );
    });
    wrap(<NotificationBell />);

    fireEvent.click(await screen.findByRole('button', { name: /Notificaciones/ }));
    fireEvent.click(await screen.findByText('Vaqui anotó $20.000 · nafta'));

    await waitFor(() =>
      expect(
        requests.some((r) => r.method === 'POST' && r.url.includes('/notifications/n1/read')),
      ).toBe(true),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/transactions?edit=tx-1');
  });

  it('marcar todas leídas pega al endpoint', async () => {
    stubFetch((_url, options) => {
      if (options?.method === 'POST') return jsonResponse(204);
      return jsonResponse(
        200,
        payload({ unreadCount: 1, movements: { recent: [item()], older: [], unreadCount: 1 } }),
      );
    });
    wrap(<NotificationBell />);

    fireEvent.click(await screen.findByRole('button', { name: /Notificaciones/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Marcar todas leídas' }));

    await waitFor(() =>
      expect(requests.some((r) => r.url.includes('/notifications/read-all'))).toBe(true),
    );
  });

  // S44 — botón físico "atrás" de Android: el panel se registra en la pila de `nativeBack`
  // mientras está abierto. Se corre la pila a mano, igual que el listener de `nativeBootstrap`.
  it('el back de Android cierra el panel y no sale de la app', async () => {
    stubFetch(() => jsonResponse(200, payload()));
    wrap(<NotificationBell />);

    fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones' }));
    expect(screen.getByRole('dialog', { name: 'Notificaciones' })).toBeInTheDocument();

    let consumido = false;
    act(() => {
      consumido = runBackInterceptors();
    });

    expect(consumido).toBe(true);
    expect(screen.queryByRole('dialog', { name: 'Notificaciones' })).toBeNull();
    // Cerrado no se mete en el camino del back.
    expect(runBackInterceptors()).toBe(false);
  });

  it('Esc cierra el panel', async () => {
    stubFetch(() => jsonResponse(200, payload({ movements: { recent: [item()], older: [], unreadCount: 0 } })));
    wrap(<NotificationBell />);

    fireEvent.click(await screen.findByRole('button', { name: /Notificaciones/ }));
    expect(screen.getByRole('dialog', { name: 'Notificaciones' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
