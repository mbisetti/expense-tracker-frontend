import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { SettingsPage } from './SettingsPage';
import { jsonResponse } from '../../test/mockResponse';
import { selectOption, selectValue } from '../../test/selectOption';

function renderSettings() {
  const setAccessToken = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken }}
      >
        <ToastProvider>
          <MemoryRouter>
            <SettingsPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { setAccessToken };
}

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('SettingsPage', () => {
  it('muestra las preferencias; la cuenta se mudó a su propia página (S25.4)', () => {
    renderSettings();

    expect(screen.getByRole('heading', { name: 'Ajustes y preferencias' })).toBeInTheDocument();
    expect(screen.getByText('Tema')).toBeInTheDocument();
    expect(screen.getByLabelText('Formato de fecha', { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText('Calendario', { exact: false })).toBeInTheDocument();

    // D8 revertida (pedido de Marko post-deploy): sin sidebar, columna simple.
    expect(screen.queryByRole('navigation', { name: 'Secciones de ajustes' })).not.toBeInTheDocument();

    // D7: lo de la cuenta ya NO vive acá (borrado, email, Telegram → página Cuenta).
    expect(screen.queryByRole('button', { name: 'Borrar cuenta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cambiar email' })).not.toBeInTheDocument();
    // Categorías/Métodos se mudaron a la página Datos (S21)
    expect(screen.queryByRole('link', { name: 'Categorías' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Métodos de pago' })).not.toBeInTheDocument();
  });

  it('moneda favorita: muestra la actual (server) y al cambiarla pega PATCH /users/me', async () => {
    const me = { id: 'u1', email: 'a@a.com', name: 'A', defaultCurrency: 'ARS', createdAt: '2026-01-01T00:00:00' };
    const patchBodies: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, opts?: RequestInit) => {
        if (opts?.method === 'PATCH') {
          const body = JSON.parse(opts.body as string);
          patchBodies.push(body);
          return jsonResponse(200, { ...me, defaultCurrency: body.defaultCurrency });
        }
        if (String(url).includes('/users/me')) return jsonResponse(200, me);
        return jsonResponse(200, {});
      }),
    );
    renderSettings();

    await waitFor(() => expect(selectValue('Moneda favorita', { exact: false })).toBe('ARS'));

    await selectOption('Moneda favorita', 'USD', { exact: false });
    await waitFor(() => expect(patchBodies).toContainEqual({ defaultCurrency: 'USD' }));
  });

  it('elegir formato de fecha yankee lo persiste en localStorage', async () => {
    renderSettings();

    await selectOption('Formato de fecha', 'us', { exact: false });
    expect(localStorage.getItem('dateFormat')).toBe('us');
  });

  it('elegir calendario US lo persiste en localStorage', async () => {
    renderSettings();

    await selectOption('Calendario', 'US', { exact: false });
    expect(localStorage.getItem('holidayCalendar')).toBe('US');
  });
});

// S49 (D3/D12) — la casa del dólar en Preferencias.
describe('SettingsPage: cotización del dólar (S49)', () => {
  const ME = {
    id: 'u1',
    email: 'a@a.com',
    name: 'A',
    defaultCurrency: 'ARS',
    workingCurrencies: [],
    arsQuote: 'MEP',
    createdAt: '2026-01-01T00:00:00',
  };

  const INDEXES = {
    usd: {
      MEP: { buy: 1529.5, sell: 1533, date: '2026-09-09' },
      BLUE: { buy: 1525, sell: 1540, date: '2026-09-09' },
      OFICIAL: { buy: 1485, sell: 1535, date: '2026-09-09' },
    },
    ipc: { month: '2026-07', value: 12076.3937 },
  };

  function stub(indexes: unknown, patchBodies: Record<string, unknown>[] = []) {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, opts?: RequestInit) => {
        if (opts?.method === 'PATCH') {
          const body = JSON.parse(opts.body as string);
          patchBodies.push(body);
          return jsonResponse(200, { ...ME, ...body });
        }
        if (String(url).includes('/indexes/latest')) return jsonResponse(200, indexes);
        if (String(url).includes('/users/me')) return jsonResponse(200, ME);
        return jsonResponse(200, {});
      }),
    );
  }

  it('muestra la casa guardada y al cambiarla pega PATCH /users/me', async () => {
    const patchBodies: Record<string, unknown>[] = [];
    stub(INDEXES, patchBodies);
    renderSettings();

    await waitFor(() => expect(selectValue('Cotización del dólar', { exact: false })).toBe('MEP'));

    await selectOption('Cotización del dólar', 'BLUE', { exact: false });

    await waitFor(() => expect(patchBodies).toContainEqual({ arsQuote: 'BLUE' }));
    expect(await screen.findByText('Cotización guardada.')).toBeInTheDocument();
  });

  it('el helper muestra los tres valores de hoy', async () => {
    stub(INDEXES);
    renderSettings();

    expect(
      await screen.findByText(/Hoy: MEP \$ ?1\.533 · Blue \$ ?1\.540 · Oficial \$ ?1\.535/),
    ).toBeInTheDocument();
  });

  // El job todavía no corrió (primer deploy): el selector funciona igual, sin la línea de valores.
  it('sin datos de índices no muestra la línea "Hoy:"', async () => {
    stub({ usd: { MEP: null, BLUE: null, OFICIAL: null }, ipc: null });
    renderSettings();

    await waitFor(() => expect(selectValue('Cotización del dólar', { exact: false })).toBe('MEP'));
    expect(screen.queryByText(/Hoy:/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Nunca cambia lo que ya anotaste\./),
    ).toBeInTheDocument();
  });
});
