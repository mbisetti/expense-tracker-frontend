import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { AccountsPage } from './AccountsPage';
import { jsonResponse, ok } from '../../test/mockResponse';

const account = {
  id: 'acc-1',
  name: 'Billetera',
  type: 'CASH',
  currency: 'ARS',
  balance: 1000,
  isInformal: false,
  createdAt: '2026-07-01T00:00:00',
};

const informalAccount = {
  id: 'acc-2',
  name: 'Efectivo dólares',
  type: 'CASH',
  currency: 'USD',
  balance: 500,
  isInformal: true,
  createdAt: '2026-07-01T00:00:00',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <AccountsPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountsPage', () => {
  it('borrar cuenta con transacciones: 409 muestra mensaje y la cuenta sigue listada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'DELETE') {
          return jsonResponse(409, { error: 'ACCOUNT_HAS_TRANSACTIONS', message: 'has transactions' });
        }
        if (url.includes('/accounts')) return jsonResponse(200, [account]);
        return jsonResponse(200, []);
      }),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se puede borrar: la cuenta tiene transacciones.',
    );
    expect(screen.getByText('Billetera')).toBeInTheDocument();
  });

  it('cuenta sin transacciones se borra y desaparece de la lista', async () => {
    let deleted = false;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'DELETE') {
          deleted = true;
          // Contrato: 204 sin body
          return Promise.resolve({ ok: true, status: 204 } as Response);
        }
        if (url.includes('/accounts'))
          return jsonResponse(200, deleted ? [] : [account]);
        return jsonResponse(200, []);
      }),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));

    expect(
      await screen.findByText(
        'Todavía no tenés cuentas. Creá la primera para empezar a registrar transacciones.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cuenta informal muestra la insignia "Informal" y la formal no', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/accounts')) return ok([account, informalAccount]);
        return ok([]);
      }),
    );

    renderPage();

    const informalRow = (await screen.findByRole('row', { name: /Efectivo dólares/ }));
    expect(within(informalRow).getByText('Informal')).toBeInTheDocument();

    const formalRow = screen.getByRole('row', { name: /Billetera/ });
    expect(within(formalRow).queryByText('Informal')).not.toBeInTheDocument();
  });

  it('crear cuenta con "Cuenta informal" tildado manda isInformal:true', async () => {
    let postedBody: Record<string, unknown> | undefined;
    let created: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          postedBody = JSON.parse(options.body as string);
          created = { ...account, ...postedBody, id: 'acc-new' };
          return ok(created);
        }
        if (url.includes('/accounts')) return ok(created ? [created] : []);
        return ok([]);
      }),
    );

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva cuenta' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Caja fuerte' } });
    fireEvent.change(screen.getByLabelText('Moneda (código de 3 letras)'), {
      target: { value: 'USD' },
    });
    fireEvent.click(screen.getByLabelText(/Cuenta informal/));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await screen.findByText('Caja fuerte');
    expect(postedBody).toMatchObject({ name: 'Caja fuerte', currency: 'USD', isInformal: true });
  });
});
