import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { AccountsPage } from './AccountsPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
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

// Sprint 22: cuenta mixta — principal ARS + sub-balance USD (≠0) + EUR (0, oculto).
const mixedAccount = {
  id: 'acc-mix',
  name: 'Mercado Pago',
  type: 'CASH',
  currency: 'ARS',
  balance: 1000,
  isInformal: false,
  createdAt: '2026-07-01T00:00:00',
  statementCloseDay: null,
  paymentDueDay: null,
  balances: [
    { currency: 'ARS', balance: 1000 },
    { currency: 'EUR', balance: 0 },
    { currency: 'USD', balance: 320.5 },
  ],
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

// Sprint 22.2: dos cuentas de la misma institución (agrupación D4).
const bankCA = {
  id: 'bank-ca', name: 'Caja de ahorro', type: 'BANK', currency: 'ARS', balance: 80000,
  isInformal: false, createdAt: '2026-07-01T00:00:00', statementCloseDay: null, paymentDueDay: null,
  balances: [{ currency: 'ARS', balance: 80000 }], institution: 'Santander', linkedAccountId: null,
};
const bankPF = {
  id: 'bank-pf', name: 'Plazo fijo', type: 'BANK', currency: 'ARS', balance: 500000,
  isInformal: false, createdAt: '2026-07-01T00:00:00', statementCloseDay: null, paymentDueDay: null,
  balances: [{ currency: 'ARS', balance: 500000 }], institution: 'Santander', linkedAccountId: null,
};
// Cuenta banco con una tarjeta débito (PM) y una crédito hija (D2).
const parentBank = {
  id: 'bank-1', name: 'Santander CA', type: 'BANK', currency: 'ARS', balance: 80000,
  isInformal: false, createdAt: '2026-07-01T00:00:00', statementCloseDay: null, paymentDueDay: null,
  balances: [{ currency: 'ARS', balance: 80000 }], institution: null, linkedAccountId: null,
};
const childCredit = {
  id: 'card-1', name: 'Visa *8190', type: 'CREDIT', currency: 'ARS', balance: -4000,
  isInformal: false, createdAt: '2026-07-01T00:00:00', statementCloseDay: 10, paymentDueDay: 20,
  balances: [{ currency: 'ARS', balance: -4000 }], institution: null, linkedAccountId: 'bank-1',
};
const debitPm = {
  id: 'pm-1', userId: 'u1', accountId: 'bank-1', name: 'Visa *4160', type: 'DEBIT',
  isDefault: false, createdAt: '2026-07-01T00:00:00',
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
        <ToastProvider>
          <MemoryRouter>
            <AccountsPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function deleteDialog() {
  return screen.getByRole('dialog', { name: 'Borrar cuenta' });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountsPage', () => {
  it('borrar cuenta con transacciones: 409 muestra un toast de error y la cuenta sigue listada', async () => {
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
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Billetera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    fireEvent.click(within(deleteDialog()).getByRole('button', { name: 'Borrar' }));

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
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Billetera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    fireEvent.click(within(deleteDialog()).getByRole('button', { name: 'Borrar' }));

    expect(
      await screen.findByText('Todavía no tenés cuentas.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cancelar el ConfirmDialog no borra la cuenta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'DELETE') throw new Error('no debería llamarse');
        if (url.includes('/accounts')) return jsonResponse(200, [account]);
        return jsonResponse(200, []);
      }),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Billetera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    fireEvent.click(within(deleteDialog()).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Billetera')).toBeInTheDocument();
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

    const informalCard = await screen.findByRole('group', { name: 'Efectivo dólares' });
    expect(within(informalCard).getByText('Informal')).toBeInTheDocument();

    const formalCard = screen.getByRole('group', { name: 'Billetera' });
    expect(within(formalCard).queryByText('Informal')).not.toBeInTheDocument();
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
    // Nombre/Moneda son required: el label agrega un "*" (aria-hidden) → exact:false.
    fireEvent.change(screen.getByLabelText('Nombre', { exact: false }), { target: { value: 'Caja fuerte' } });
    fireEvent.change(screen.getByLabelText('Moneda (código de 3 letras)', { exact: false }), {
      target: { value: 'USD' },
    });
    fireEvent.click(screen.getByLabelText(/Cuenta informal/));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await screen.findByText('Caja fuerte');
    expect(postedBody).toMatchObject({ name: 'Caja fuerte', currency: 'USD', isInformal: true });
  });

  it('cuenta mixta: muestra chip del sub-balance no-principal (≠0) y oculta el de 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/accounts')) return ok([mixedAccount]);
        return ok([]); // useTransactions → sin movimientos
      }),
    );

    renderPage();

    const card = await screen.findByRole('group', { name: 'Mercado Pago' });
    // chip USD (US$ 320,50) visible
    expect(within(card).getByText(/320,50/)).toBeInTheDocument();
    // EUR en 0 → sin chip (no aparece el símbolo €)
    expect(within(card).queryByText(/€/)).not.toBeInTheDocument();
  });

  it('chip de moneda secundaria: expone el equivalente estimado en la moneda favorita', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const u = String(url);
        if (u.includes('/users/me'))
          return ok({ id: 'u1', email: 'a@a.com', name: 'A', defaultCurrency: 'ARS', createdAt: '2026-01-01T00:00:00' });
        if (u.includes('/exchange-rates'))
          return ok({ base: 'USD', target: 'ARS', rate: 1000, asOf: null, unavailable: false });
        if (u.includes('/accounts')) return ok([mixedAccount]);
        return ok([]); // useTransactions
      }),
    );

    renderPage();

    const card = await screen.findByRole('group', { name: 'Mercado Pago' });
    // el chip USD (≠ favorita ARS) trae el botón info… (espera a que cargue la moneda favorita)
    expect(await within(card).findByRole('button', { name: /Equivalente estimado en ARS/ })).toBeInTheDocument();
    // …y el equivalente estimado (320,5 × 1000 = 320.500)
    expect(await within(card).findByText(/320\.500,00.*estimado/)).toBeInTheDocument();
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

  it('tarjeta de crédito con ciclo: el resumen aparece DENTRO de la card, no como sección aparte', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/statement')) return ok(statementFixture);
        if (url.includes('/accounts')) return ok([account, creditCard]);
        return ok([]);
      }),
    );

    renderPage();

    // el resumen del ciclo vive dentro de la card de la Visa (Sprint 22.1); colapsado por
    // defecto (S22.2), el toggle "Resumen del ciclo" prueba que está dentro de la card.
    const card = await screen.findByRole('group', { name: 'Visa' });
    expect(await within(card).findByRole('button', { name: /Resumen del ciclo/ })).toBeInTheDocument();
    // ya no hay una sección separada al final de la página
    expect(screen.queryByRole('heading', { name: 'Tarjetas de crédito' })).not.toBeInTheDocument();
  });

  // ── Sprint 22.2 ────────────────────────────────────────────────────────────

  it('agrupa por institución: 2 cuentas Santander en una card de grupo con header', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const u = String(url);
        if (u.includes('/payment-methods')) return ok([]);
        if (u.includes('/accounts')) return ok([bankCA, bankPF]);
        return ok([]);
      }),
    );

    renderPage();

    await screen.findByRole('group', { name: 'Caja de ahorro' });
    expect(screen.getByRole('group', { name: 'Plazo fijo' })).toBeInTheDocument();
    // header del grupo (texto exacto "Santander"; los subtítulos son "Banco · Santander · ARS")
    expect(screen.getByText('Santander')).toBeInTheDocument();
  });

  it('bloque con tarjetas: débito un renglón, crédito hija dentro de la madre (no top-level)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const u = String(url);
        if (u.includes('/statement')) return ok({ ...statementFixture, accountId: 'card-1' });
        if (u.includes('/payment-methods')) return ok([debitPm]);
        if (u.includes('/accounts')) return ok([parentBank, childCredit]);
        return ok([]);
      }),
    );

    renderPage();

    const bankCard = await screen.findByRole('group', { name: 'Santander CA' });
    expect(within(bankCard).getByText(/Visa \*4160 · Débito/)).toBeInTheDocument();
    expect(within(bankCard).getByText(/Visa \*8190 · Crédito/)).toBeInTheDocument();
    // la CREDIT hija no se renderiza como card top-level propia (D7)
    expect(screen.queryByRole('group', { name: 'Visa *8190' })).not.toBeInTheDocument();
  });

  it('"Agregar tarjeta" aparece en BANK con 0 tarjetas y no en una cuenta CASH', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const u = String(url);
        if (u.includes('/payment-methods')) return ok([]);
        if (u.includes('/accounts')) return ok([parentBank, account]);
        return ok([]);
      }),
    );

    renderPage();

    const bankCard = await screen.findByRole('group', { name: 'Santander CA' });
    expect(within(bankCard).getByRole('button', { name: 'Agregar tarjeta' })).toBeInTheDocument();

    const cashCard = screen.getByRole('group', { name: 'Billetera' });
    expect(
      within(cashCard).queryByRole('button', { name: 'Agregar tarjeta' }),
    ).not.toBeInTheDocument();
  });
});
