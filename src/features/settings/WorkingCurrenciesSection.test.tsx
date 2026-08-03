import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { WorkingCurrenciesSection } from './WorkingCurrenciesSection';
import { ok } from '../../test/mockResponse';

const me = {
  id: 'u-1',
  email: 'a@test.com',
  name: 'Marko',
  defaultCurrency: 'ARS',
  workingCurrencies: ['ARS', 'USD'],
  hasPassword: true,
  createdAt: '2026-07-01T00:00:00',
};

function stub(onPatch?: (body: Record<string, unknown>) => void) {
  return vi.fn((_url: string, options?: RequestInit) => {
    if (options?.method === 'PATCH') {
      const body = JSON.parse(options.body as string);
      onPatch?.(body);
      return ok({ ...me, ...body });
    }
    return ok(me);
  });
}

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <WorkingCurrenciesSection />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('WorkingCurrenciesSection (S27.1)', () => {
  it('lista las monedas configuradas con su nombre', async () => {
    vi.stubGlobal('fetch', stub());
    renderSection();

    expect(await screen.findByText(/pesos/)).toBeInTheDocument();
    expect(screen.getByText(/dólares/)).toBeInTheDocument();
  });

  // D3: sin esto el usuario puede configurarse fuera de su propia moneda de referencia.
  it('la favorita no se puede quitar', async () => {
    vi.stubGlobal('fetch', stub());
    renderSection();

    await screen.findByText(/pesos/);
    expect(screen.queryByRole('button', { name: 'Quitar ARS' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar USD' })).toBeInTheDocument();
    expect(screen.getByText('(favorita)')).toBeInTheDocument();
  });

  it('agregar manda la lista completa, en mayúsculas', async () => {
    let body: Record<string, unknown> | undefined;
    vi.stubGlobal('fetch', stub((b) => (body = b)));
    renderSection();

    const input = await screen.findByLabelText(/Agregar una moneda/);
    // el input descarta lo que no sea A-Z y pasa a mayúsculas mientras se tipea
    fireEvent.change(input, { target: { value: 'eu2r' } });
    expect(input).toHaveValue('EUR');

    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    await waitFor(() => expect(body).toEqual({ workingCurrencies: ['ARS', 'USD', 'EUR'] }));
  });

  it('quitar manda la lista sin esa moneda', async () => {
    let body: Record<string, unknown> | undefined;
    vi.stubGlobal('fetch', stub((b) => (body = b)));
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: 'Quitar USD' }));

    await waitFor(() => expect(body).toEqual({ workingCurrencies: ['ARS'] }));
  });

  it('no deja agregar una que ya está, ni con menos de 3 letras', async () => {
    vi.stubGlobal('fetch', stub());
    renderSection();

    const input = await screen.findByLabelText(/Agregar una moneda/);

    fireEvent.change(input, { target: { value: 'US' } });
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();

    fireEvent.change(input, { target: { value: 'USD' } });
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
    expect(screen.getByText('Ya está en la lista')).toBeInTheDocument();
  });

  // El riesgo de esta pantalla es que se lea como una restricción.
  it('el copy aclara que agrega opciones y no las quita', async () => {
    vi.stubGlobal('fetch', stub());
    renderSection();

    expect(await screen.findByText(/Agregan opciones, no las quitan/)).toBeInTheDocument();
  });
});
