import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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
