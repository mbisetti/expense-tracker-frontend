import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { GroupsPage } from './GroupsPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ok } from '../../test/mockResponse';
import type { GroupSummary } from './api';

type Call = { url: string; method: string; body?: string };

function group(overrides: Partial<GroupSummary> = {}): GroupSummary {
  return {
    id: 'g1',
    name: 'Depto',
    currency: 'ARS',
    simplifyDebts: true,
    owner: true,
    memberCount: 2,
    myBalance: [],
    ...overrides,
  };
}

function stubFetch(groups: GroupSummary[]) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.includes('/groups') && method === 'POST') {
        return ok({ ...group(), id: 'g-nuevo', name: 'Viaje' });
      }
      if (url.includes('/groups')) return ok(groups);
      return ok({});
    }),
  );
  return calls;
}

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/grupos', element: <GroupsPage /> },
      { path: '/grupos/:id', element: <h1>Detalle</h1> },
    ],
    { initialEntries: ['/grupos'] },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GroupsPage (S47)', () => {
  it('sin grupos muestra el empty state con su CTA, nunca una pantalla en blanco', async () => {
    stubFetch([]);
    renderPage();

    await screen.findByText('Todavía no tenés grupos.');
    expect(screen.getByRole('button', { name: 'Crear el primero' })).toBeInTheDocument();
  });

  it('el saldo se muestra por moneda y con la palabra, no sólo con el signo', async () => {
    stubFetch([
      group({
        myBalance: [
          { currency: 'ARS', net: 12000 },
          { currency: 'USD', net: -30 },
        ],
      }),
    ]);
    renderPage();

    await screen.findByRole('heading', { name: 'Depto' });
    // Positivo y negativo conviven sin consolidarse: son dos monedas y son dos líneas.
    expect(screen.getByText('Te deben')).toBeInTheDocument();
    expect(screen.getByText('Debés')).toBeInTheDocument();
  });

  it('un grupo recién creado, sin gastos, dice que están a mano', async () => {
    stubFetch([group()]);
    renderPage();

    await screen.findByRole('heading', { name: 'Depto' });
    expect(screen.getByText('Están a mano')).toBeInTheDocument();
  });

  it('crear un grupo manda el nombre y cierra el formulario', async () => {
    const calls = stubFetch([]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo grupo' }));
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: '  Viaje  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear grupo' }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST');
      expect(post).toBeDefined();
      // Se manda con trim: " Viaje " y "Viaje" son el mismo grupo.
      expect(JSON.parse(post!.body!)).toEqual({ name: 'Viaje' });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('sin nombre no se puede crear', async () => {
    stubFetch([]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo grupo' }));
    expect(screen.getByRole('button', { name: 'Crear grupo' })).toBeDisabled();
  });
});
