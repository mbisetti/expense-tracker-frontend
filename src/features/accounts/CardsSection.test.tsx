import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { CardsSection } from './CardsSection';
import type { Account } from './api';
import type { PaymentMethod } from '../paymentMethods/api';

// Sprint 22.3 (A1–A3): la sección Tarjetas usa la tipografía del resto de la card.
// Estos tests aíslan CardsSection sin providers: el débito es un PaymentMethod y el
// crédito es una cuenta hija SIN ciclo (statementCloseDay: null) para no montar
// <CreditCardStatement> (que sí necesita React Query/Auth/Toast).

const bank: Account = {
  id: 'bank-1',
  name: 'Santander',
  type: 'BANK',
  currency: 'ARS',
  balance: 5000,
  isInformal: false,
  createdAt: '2026-07-01T00:00:00',
  statementCloseDay: null,
  paymentDueDay: null,
  balances: [{ currency: 'ARS', balance: 5000 }],
  institution: null,
  linkedAccountId: null,
};

const debitPm: PaymentMethod = {
  id: 'pm-1',
  userId: 'u-1',
  accountId: 'bank-1',
  name: 'Visa Débito',
  type: 'DEBIT',
  isDefault: false,
  createdAt: '2026-07-01T00:00:00',
};

const creditChild: Account = {
  ...bank,
  id: 'card-1',
  name: 'Visa *4160',
  type: 'CREDIT',
  balance: -1000,
  linkedAccountId: 'bank-1',
  // sin ciclo → CardsSection no renderiza el resumen (evita providers en el test)
  statementCloseDay: null,
  paymentDueDay: null,
};

describe('CardsSection typography (S22.3 A1–A3)', () => {
  it('A2: el título "Tarjetas" es text-sm', () => {
    render(
      <CardsSection
        account={bank}
        allAccounts={[bank]}
        paymentMethods={[debitPm]}
        transactions={[]}
        onAddCard={() => {}}
      />,
    );
    const title = screen.getByText('Tarjetas');
    expect(title).toHaveClass('text-sm');
    expect(title).not.toHaveClass('text-xs');
  });

  it('A1: la fila de débito es text-sm text-body', () => {
    render(
      <CardsSection
        account={bank}
        allAccounts={[bank]}
        paymentMethods={[debitPm]}
        transactions={[]}
        onAddCard={() => {}}
      />,
    );
    const row = screen.getByText(/Visa Débito · Débito/);
    expect(row).toHaveClass('text-sm');
    expect(row).toHaveClass('text-body');
    expect(row).not.toHaveClass('text-base');
  });

  it('A3: la fila de crédito es text-sm text-body (mismo gris que débito, no text-ink)', () => {
    render(
      <CardsSection
        account={bank}
        allAccounts={[bank, creditChild]}
        paymentMethods={[]}
        transactions={[]}
        onAddCard={() => {}}
      />,
    );
    const row = screen.getByText(/Visa \*4160 · Crédito/);
    expect(row).toHaveClass('text-sm');
    expect(row).toHaveClass('text-body');
    expect(row).not.toHaveClass('text-ink');
    expect(row).not.toHaveClass('text-base');
  });

  it('A2: el título con 0 tarjetas también es text-sm', () => {
    render(
      <CardsSection
        account={bank}
        allAccounts={[bank]}
        paymentMethods={[]}
        transactions={[]}
        onAddCard={() => {}}
      />,
    );
    const title = screen.getByText('Tarjetas');
    expect(title).toHaveClass('text-sm');
    expect(title).not.toHaveClass('text-xs');
  });
});

// Sprint 27: la deuda de una tarjeta dejó de ser un número.
//
// A diferencia de los de arriba, estos SÍ montan providers: los sub-balances se muestran con
// SubBalanceChip, que por dentro pide la cotización (useExchangeRate → useHttp → useAuth) para
// el equivalente estimado al hover. Es el mismo chip que usan las cuentas — reusarlo es lo que
// evita inventar un segundo dialecto visual para la misma idea.
describe('CardsSection — sub-deudas por moneda (S27)', () => {
  const dualCard: Account = {
    ...creditChild,
    balances: [
      { currency: 'ARS', balance: -1000 },
      { currency: 'USD', balance: -100 },
    ],
  };

  function renderWithProviders(ui: React.ReactElement) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
        >
          {ui}
        </AuthContext.Provider>
      </QueryClientProvider>,
    );
  }

  // La card vive COLAPSADA la mayor parte del tiempo, y ahí solo se veía el saldo de la moneda
  // principal: los dólares que debías no aparecían por ningún lado hasta desplegar el resumen.
  it('la fila de la tarjeta muestra la deuda en pesos Y la de dólares', () => {
    renderWithProviders(
      <CardsSection
        account={bank}
        allAccounts={[bank, dualCard]}
        paymentMethods={[]}
        transactions={[]}
        onAddCard={() => {}}
        favoriteCurrency="ARS"
      />,
    );

    expect(screen.getByText(/-\$\s?1\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/US\$\s?100,00|-US\$\s?100,00/)).toBeInTheDocument();
  });

  // "No se muestran ceros" también acá: una moneda saldada no ensucia la fila.
  it('una moneda con saldo 0 no genera chip', () => {
    const settled: Account = {
      ...creditChild,
      balances: [
        { currency: 'ARS', balance: -1000 },
        { currency: 'USD', balance: 0 },
      ],
    };
    renderWithProviders(
      <CardsSection
        account={bank}
        allAccounts={[bank, settled]}
        paymentMethods={[]}
        transactions={[]}
        onAddCard={() => {}}
        favoriteCurrency="ARS"
      />,
    );

    expect(screen.queryByText(/US\$/)).not.toBeInTheDocument();
  });
});
