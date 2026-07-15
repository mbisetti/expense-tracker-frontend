import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { IncomeSourceList } from './IncomeSourceList';
import { ok } from '../../test/mockResponse';

// Captura los bodies de los POST a /income-sources para verificar el payload atómico.
function setup() {
  const posts: unknown[] = [];
  const fetchMock = vi.fn((_url: string, options?: RequestInit) => {
    if (options && options.method === 'POST') {
      posts.push(JSON.parse(options.body as string));
      return ok({
        id: 'new', name: 'X', currency: 'ARS', active: true,
        frequency: null, expectedAmount: null, billingDay: null,
        createdAt: '2026-07-15T00:00:00',
      });
    }
    return ok([]); // GET lista vacía
  });
  vi.stubGlobal('fetch', fetchMock);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <IncomeSourceList />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return posts;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IncomeSourceList — recurrencia', () => {
  it('sin marcar recurrente manda solo name + currency', async () => {
    const posts = setup();

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva fuente' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Freelance' } });
    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'ARS' } });
    // sin togglear recurrencia, los campos no existen
    expect(screen.queryByLabelText('Monto esperado')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({ name: 'Freelance', currency: 'ARS' });
  });

  it('marcando recurrente revela los campos y manda los tres juntos (atómico)', async () => {
    const posts = setup();

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva fuente' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Sueldo' } });
    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'ARS' } });

    fireEvent.click(screen.getByLabelText('¿Es un ingreso recurrente?'));

    fireEvent.change(screen.getByLabelText('Frecuencia'), { target: { value: 'BIWEEKLY' } });
    fireEvent.change(screen.getByLabelText('Monto esperado'), { target: { value: '500000' } });
    fireEvent.change(screen.getByLabelText('Día de cobro (1-28)'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      name: 'Sueldo',
      currency: 'ARS',
      frequency: 'BIWEEKLY',
      expectedAmount: 500000,
      billingDay: 5,
    });
  });
});
