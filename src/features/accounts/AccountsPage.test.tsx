import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { AccountsPage } from './AccountsPage';

const account = {
  id: 'acc-1',
  name: 'Billetera',
  type: 'CASH',
  currency: 'ARS',
  balance: 1000,
  createdAt: '2026-07-01T00:00:00',
};

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

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
          return Promise.resolve(
            jsonResponse(409, { error: 'ACCOUNT_HAS_TRANSACTIONS', message: 'has transactions' }),
          );
        }
        if (url.includes('/accounts')) return Promise.resolve(jsonResponse(200, [account]));
        return Promise.resolve(jsonResponse(200, []));
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
          return Promise.resolve(jsonResponse(200, deleted ? [] : [account]));
        return Promise.resolve(jsonResponse(200, []));
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
});
