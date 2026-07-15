import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
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
  statementCloseDay: null,
  paymentDueDay: null,
};

const informalAccount = {
  id: 'acc-2',
  name: 'Efectivo dólares',
  type: 'CASH',
  currency: 'USD',
  balance: 500,
  isInformal: true,
  createdAt: '2026-07-01T00:00:00',
  statementCloseDay: null,
  paymentDueDay: null,
};

const creditCard = {
  id: 'acc-3',
  name: 'Visa',
  type: 'CREDIT',
  currency: 'ARS',
  balance: -1000,
  isInformal: false,
  createdAt: '2026-07-01T00:00:00',
  statementCloseDay: 10,
  paymentDueDay: 20,
};

const statementFixture = {
  accountId: 'acc-3',
  offset: 0,
  statementCloseDay: 10,
  paymentDueDay: 20,
  currency: 'ARS',
  periodStart: '2026-06-11',
  periodEnd: '2026-07-10',
  dueDate: '2026-07-20',
  totalSpent: 5000,
  payments: 1000,
  closingBalance: -4000,
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
        <MemoryRouter>
          <AccountsPage />
        </MemoryRouter>
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

  it('sin tarjetas de crédito con ciclo configurado, no muestra la sección', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/accounts')) return ok([account]);
        return ok([]);
      }),
    );

    renderPage();

    await screen.findByText('Billetera');
    expect(screen.queryByText('Tarjetas de crédito')).not.toBeInTheDocument();
  });

  it('con una tarjeta de crédito con ciclo configurado, muestra la sección y su resumen', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/statement')) return ok(statementFixture);
        if (url.includes('/accounts')) return ok([account, creditCard]);
        return ok([]);
      }),
    );

    renderPage();

    expect(await screen.findByText('Tarjetas de crédito')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Visa' })).toBeInTheDocument();
    expect(screen.getByText(/Consumos del ciclo/)).toBeInTheDocument();
  });
});
