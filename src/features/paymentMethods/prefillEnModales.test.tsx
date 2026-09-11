import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { MarkRecurringPaidModal } from '../expenses/MarkRecurringPaidModal';
import { SettleDialog } from '../shared/SettleDialog';
import { jsonResponse } from '../../test/mockResponse';
import { selectOption, selectValue } from '../../test/selectOption';
import type { RecurringExpense } from '../expenses/api';

/**
 * S50 (D2): el prefill del método predeterminado en los dos modales que no tenían tests propios,
 * "Marcar como pagado" y "Saldar".
 *
 * Lo que importa acá y no se ve en `TransactionForm`: estos dos NO ofrecen tarjetas vinculadas
 * como opción del método, así que un predeterminado que es una tarjeta tiene que quedar en vacío.
 * Poner un value que no está entre las options deja el `<Select>` en blanco, sin error y sin
 * explicación, y el usuario manda la transacción creyendo que eligió algo.
 */

const conMetodo = {
  id: 'acc-1',
  name: 'Santander',
  type: 'BANK',
  currency: 'ARS',
  balance: 1000,
  isInformal: false,
  statementCloseDay: null,
  paymentDueDay: null,
  balances: [{ currency: 'ARS', balance: 1000 }],
  createdAt: '2026-07-01T00:00:00',
  linkedAccountId: null,
  defaultPaymentMethodId: 'pm-1',
  defaultCardAccountId: null,
};

// Su predeterminado es una TARJETA: acá no hay opción para eso, tiene que quedar vacío.
const conTarjeta = {
  ...conMetodo,
  id: 'acc-2',
  name: 'Galicia',
  defaultPaymentMethodId: null,
  defaultCardAccountId: 'card-1',
};

const tarjeta = {
  ...conMetodo,
  id: 'card-1',
  name: 'Visa Galicia',
  type: 'CREDIT',
  linkedAccountId: 'acc-2',
  defaultPaymentMethodId: null,
  defaultCardAccountId: null,
};

const metodos = [
  {
    id: 'pm-1',
    userId: 'u',
    accountId: 'acc-1',
    name: 'Transferencia bancaria',
    type: 'TRANSFER',
    isDefault: true,
    createdAt: '2026-07-01T00:00:00',
  },
];

const recurring: RecurringExpense = {
  id: 'rec-1',
  name: 'Netflix',
  amount: 5990,
  currency: 'ARS',
  categoryId: 'c1',
  frequency: 'MONTHLY',
  billingDay: 15,
  weekday: null,
  dueMonth: null,
  installmentsTotal: null,
  cashPrice: null,
  autoDebit: false,
  debitAccountId: null,
  debitPaymentMethodId: null,
  active: true,
  createdAt: '2026-07-01T00:00:00',
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/accounts')) return jsonResponse(200, [conMetodo, conTarjeta, tarjeta]);
      if (url.includes('/payment-methods')) {
        const accountId = new URL(url, 'http://x').searchParams.get('accountId');
        return jsonResponse(200, metodos.filter((m) => !accountId || m.accountId === accountId));
      }
      return jsonResponse(200, []);
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

function wrap(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>{node}</ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('MarkRecurringPaidModal · método predeterminado (S50)', () => {
  it('elegir la cuenta prefillea su método predeterminado', async () => {
    wrap(
      <MarkRecurringPaidModal
        recurring={recurring}
        defaultDate="2026-09-15"
        onClose={() => {}}
      />,
    );

    await selectOption('Cuenta', 'acc-1', { exact: false });

    await waitFor(() => expect(selectValue('Método', { exact: false })).toBe('pm-1'));
  });

  it('si el predeterminado es una tarjeta, queda vacío (este select no las ofrece)', async () => {
    wrap(
      <MarkRecurringPaidModal
        recurring={recurring}
        defaultDate="2026-09-15"
        onClose={() => {}}
      />,
    );

    await selectOption('Cuenta', 'acc-2', { exact: false });

    await waitFor(() => expect(selectValue('Cuenta', { exact: false })).toBe('acc-2'));
    expect(selectValue('Método', { exact: false })).toBe('');
  });
});

describe('SettleDialog · método predeterminado (S50)', () => {
  it('elegir la cuenta prefillea su método predeterminado', async () => {
    wrap(
      <SettleDialog
        open
        personName="Bauti"
        amount={5000}
        currency="ARS"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    await selectOption('Cuenta', 'acc-1', { exact: false });

    await waitFor(() => expect(selectValue('Método', { exact: false })).toBe('pm-1'));
  });

  it('si el predeterminado es una tarjeta, queda vacío', async () => {
    wrap(
      <SettleDialog
        open
        personName="Bauti"
        amount={5000}
        currency="ARS"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    await selectOption('Cuenta', 'acc-2', { exact: false });

    expect(selectValue('Método', { exact: false })).toBe('');
  });
});
