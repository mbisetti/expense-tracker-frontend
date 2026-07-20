import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { CreditCardStatement } from './CreditCardStatement';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ok } from '../../test/mockResponse';
import type { Account } from './api';

const card: Account = {
  id: 'acc-3',
  name: 'Visa',
  type: 'CREDIT',
  currency: 'ARS',
  balance: -1000,
  isInformal: false,
  createdAt: '2026-07-01T00:00:00',
  statementCloseDay: 10,
  paymentDueDay: 20,
  balances: [{ currency: 'ARS', balance: -1000 }],
  institution: null,
  linkedAccountId: null,
};

function statementFor(offset: number, overrides?: Partial<Record<string, unknown>>) {
  return {
    accountId: 'acc-3',
    offset,
    statementCloseDay: 10,
    paymentDueDay: 20,
    currency: 'ARS',
    periodStart: '2026-06-11',
    periodEnd: '2026-07-10',
    dueDate: '2026-07-20',
    totalSpent: 5000,
    payments: 1000,
    closingBalance: -4000,
    paid: false,
    paidWithTransfer: false,
    // Sprint 22.4: por defecto, ciclo CERRADO con deuda pendiente (el widget muestra el tick).
    closed: true,
    remainingToPay: 4000,
    ...overrides,
  };
}

const parentBank: Account = {
  id: 'bank-1',
  name: 'Banco Nación',
  type: 'BANK',
  currency: 'ARS',
  balance: 100000,
  isInformal: false,
  createdAt: '2026-07-01T00:00:00',
  statementCloseDay: null,
  paymentDueDay: null,
  balances: [{ currency: 'ARS', balance: 100000 }],
  institution: null,
  linkedAccountId: null,
};

function renderStatement(account: Account = card, parentAccount?: Account) {
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
            <CreditCardStatement account={account} parentAccount={parentAccount} />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// Sprint 22.2: el detalle arranca colapsado; se despliega con el chevron (toggle reversible).
async function expand() {
  fireEvent.click(await screen.findByRole('button', { name: /Resumen del ciclo/ }));
}

describe('CreditCardStatement', () => {
  it('colapsado por defecto: no muestra el detalle (ni consumos ni saldo al cierre)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok(statementFor(0))));

    renderStatement();

    // el header/toggle está siempre; el detalle (incluido el saldo al cierre) queda oculto
    expect(await screen.findByRole('button', { name: /Resumen del ciclo/ })).toBeInTheDocument();
    expect(screen.queryByText(/Consumos del ciclo:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Saldo al cierre:/)).not.toBeInTheDocument();
  });

  it('al expandir se ve el detalle; al volver a clickear se colapsa (reversible)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok(statementFor(0))));

    renderStatement();

    await expand();
    expect(await screen.findByText(/Consumos del ciclo:/)).toBeInTheDocument();

    // colapsar de nuevo
    fireEvent.click(screen.getByRole('button', { name: /Resumen del ciclo/ }));
    expect(screen.queryByText(/Consumos del ciclo:/)).not.toBeInTheDocument();
  });

  it('expandido: muestra consumos, pagos y saldo al cierre formateados', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok(statementFor(0))));

    renderStatement();
    await expand();

    expect(await screen.findByText(/Consumos del ciclo:/)).toHaveTextContent('$ 5.000,00');
    expect(screen.getByText(/Pagos:/)).toHaveTextContent('$ 1.000,00');
    expect(screen.getByText(/Saldo al cierre:/)).toHaveTextContent('-$ 4.000,00');
  });

  it('vencimiento futuro se muestra en tono neutro como "Vence el"', async () => {
    vi.setSystemTime(new Date('2026-07-15T12:00:00'));
    vi.stubGlobal('fetch', vi.fn(() => ok(statementFor(0, { dueDate: '2026-07-20' }))));

    renderStatement();
    await expand();

    const dueText = await screen.findByText(/Vence el/);
    expect(dueText).not.toHaveClass('text-expense');
  });

  it('vencimiento pasado se muestra en text-expense como "Vencido el"', async () => {
    vi.setSystemTime(new Date('2026-07-25T12:00:00'));
    vi.stubGlobal('fetch', vi.fn(() => ok(statementFor(0, { dueDate: '2026-07-20' }))));

    renderStatement();
    await expand();

    const dueText = await screen.findByText(/Vencido el/);
    expect(dueText).toHaveClass('text-expense');
  });

  it('en offset 0, "Siguiente" está deshabilitado y "Anterior" habilitado', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok(statementFor(0))));

    renderStatement();
    await expand();

    await screen.findByText(/Consumos del ciclo:/);
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Anterior/ })).not.toBeDisabled();
  });

  it('al hacer click en "Anterior" pide el ciclo con offset -1', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('offset=-1')) return ok(statementFor(-1, { periodStart: '2026-05-11', periodEnd: '2026-06-10' }));
      return ok(statementFor(0));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderStatement();
    await expand();

    await screen.findByText(/Consumos del ciclo:/);
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));

    expect(await screen.findByText(/hace 1 ciclo\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Siguiente/ })).not.toBeDisabled();
  });

  it('en el límite inferior (-24 ciclos), "Anterior" queda deshabilitado', async () => {
    const fetchMock = vi.fn((url: string) => {
      const m = url.match(/offset=(-?\d+)/);
      return ok(statementFor(m ? Number(m[1]) : 0));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderStatement();
    await expand();

    await screen.findByText(/Consumos del ciclo:/);
    const prev = screen.getByRole('button', { name: /Anterior/ });
    // 24 clicks: 0 → -24 (el disable lo controla el estado local de offset)
    for (let i = 0; i < 24; i++) fireEvent.click(prev);

    expect(prev).toBeDisabled();
    expect(screen.getByRole('button', { name: /Siguiente/ })).not.toBeDisabled();
  });

  // ── Sprint 22.4: widget "Pagar resumen" ──────────────────────────────────

  it('widget: ciclo abierto → "El resumen cierra el …", sin botones', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok(statementFor(0, { closed: false }))));

    renderStatement();
    await expand();

    expect(await screen.findByText(/El resumen cierra el/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pagado' })).not.toBeInTheDocument();
  });

  it('widget: cerrado sin deuda → "No hay nada que pagar"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => ok(statementFor(0, { closed: true, closingBalance: 0, remainingToPay: 0 }))),
    );

    renderStatement();
    await expand();

    expect(await screen.findByText(/No hay nada que pagar/)).toBeInTheDocument();
  });

  it('widget: suelta con deuda → tick abre confirmar-marca → PUT pay:false', async () => {
    let putBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn((_url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') {
        putBody = JSON.parse(options.body as string);
        return ok({});
      }
      return ok(statementFor(0));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderStatement(); // sin madre → solo marca cosmética
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: 'Pagado' }));
    expect(await screen.findByText(/no mueve plata ni cambia tus saldos/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar' }));

    await waitFor(() => expect(putBody).toEqual({ periodEnd: '2026-07-10', pay: false }));
  });

  it('widget: pagado cosmético → ✗ hace DELETE directo (sin diálogo)', async () => {
    let deleteUrl: string | undefined;
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === 'DELETE') {
        deleteUrl = url;
        return ok({});
      }
      return ok(statementFor(0, { paid: true, paidWithTransfer: false }));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderStatement();
    await expand();

    expect(await screen.findByRole('button', { name: 'Pagado' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'No pagado' }));

    await waitFor(() => expect(deleteUrl).toContain('periodEnd=2026-07-10'));
    expect(screen.queryByText(/Deshacer el pago/)).not.toBeInTheDocument();
  });

  it('widget: pagado real → ✗ pide confirmación antes del DELETE', async () => {
    let deleteUrl: string | undefined;
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === 'DELETE') {
        deleteUrl = url;
        return ok({});
      }
      return ok(statementFor(0, { paid: true, paidWithTransfer: true }));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderStatement();
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: 'No pagado' }));
    expect(await screen.findByText(/Se va a borrar la transferencia/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));

    await waitFor(() => expect(deleteUrl).toContain('periodEnd=2026-07-10'));
  });

  it('widget: vinculada con deuda → "Pagar desde {madre}" hace PUT pay:true', async () => {
    let putBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn((_url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') {
        putBody = JSON.parse(options.body as string);
        return ok({});
      }
      return ok(statementFor(0));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderStatement(card, parentBank); // madre con saldo ARS suficiente
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: 'Pagado' }));
    fireEvent.click(await screen.findByRole('button', { name: /Pagar desde Banco Nación/ }));

    await waitFor(() => expect(putBody).toEqual({ periodEnd: '2026-07-10', pay: true }));
  });

  it('widget: vinculada sin saldo en la moneda → diálogo de otra moneda, sin PUT', async () => {
    const fetchMock = vi.fn((_url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') return ok({});
      return ok(statementFor(0));
    });
    vi.stubGlobal('fetch', fetchMock);

    const parentUsd: Account = { ...parentBank, balances: [{ currency: 'USD', balance: 100000 }] };
    renderStatement(card, parentUsd); // madre no tiene ARS (la moneda de la tarjeta)
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: 'Pagado' }));
    fireEvent.click(await screen.findByRole('button', { name: /Pagar desde Banco Nación/ }));

    expect(await screen.findByText(/No trabajamos con pagos en otra moneda/)).toBeInTheDocument();
    const putCalls = fetchMock.mock.calls.filter(
      ([, opts]) => (opts as RequestInit | undefined)?.method === 'PUT',
    );
    expect(putCalls).toHaveLength(0);
  });
});
