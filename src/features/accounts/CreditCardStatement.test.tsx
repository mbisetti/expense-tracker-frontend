import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { CreditCardStatement } from './CreditCardStatement';
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
    ...overrides,
  };
}

function renderStatement(account: Account = card) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <MemoryRouter>
          <CreditCardStatement account={account} />
        </MemoryRouter>
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
});
