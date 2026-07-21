import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { AccountForm } from './AccountForm';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ok } from '../../test/mockResponse';
import { openSelect, selectOption } from '../../test/selectOption';
import type { Account } from './api';

const creditAccount: Account = {
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

// Tarjeta de crédito vinculada (con ciclo: los inputs required quedan completos → el
// submit del navegador no se bloquea en el test de desvinculación).
const linkedCard: Account = {
  id: 'card-1',
  name: 'Visa *8190',
  type: 'CREDIT',
  currency: 'ARS',
  balance: -2000,
  isInformal: false,
  createdAt: '2026-07-01T00:00:00',
  statementCloseDay: 10,
  paymentDueDay: 20,
  balances: [{ currency: 'ARS', balance: -2000 }],
  institution: null,
  linkedAccountId: 'bank-1',
};

function renderForm(account?: Account, accounts?: Account[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <AccountForm account={account} accounts={accounts} onClose={() => {}} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountForm', () => {
  it('con tipo Efectivo (default) no muestra los inputs de ciclo', () => {
    renderForm();

    expect(screen.queryByLabelText('Día de cierre (1-28)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Día de vencimiento (1-28)')).not.toBeInTheDocument();
  });

  it('el alta NO ofrece "Tarjeta de crédito" (una tarjeta nace desde el bloque, D9)', async () => {
    renderForm();

    const listbox = await openSelect('Tipo');
    const values = within(listbox)
      .getAllByRole('option')
      .map((o) => o.getAttribute('data-value'));
    expect(values).toEqual(['CASH', 'BANK', 'WALLET', 'INVESTMENT', 'CRYPTO', 'DEBT']);
    expect(values).not.toContain('CREDIT');
  });

  it('la edición ofrece las 7 opciones, incluida Tarjeta de crédito', async () => {
    renderForm(bank);

    const listbox = await openSelect('Tipo');
    const values = within(listbox)
      .getAllByRole('option')
      .map((o) => o.getAttribute('data-value'));
    expect(values).toHaveLength(7);
    expect(values).toContain('CREDIT');
  });

  it('editar una CREDIT con ciclo deshabilita el selector de tipo (conversión imposible hoy)', () => {
    renderForm(creditAccount);

    // creditAccount tiene statementCloseDay=10 → typeLocked
    expect(screen.getByLabelText('Tipo')).toBeDisabled();
  });

  it('tarjeta vinculada: "— ninguna —" manda linkedAccountId "" (desvincula, D8)', async () => {
    let patchBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        if (options?.method === 'PATCH') {
          patchBody = JSON.parse(options.body as string);
          return ok({ ...linkedCard, ...patchBody });
        }
        return ok([]);
      }),
    );

    renderForm(linkedCard, [bank, linkedCard]);

    // el selector "Vinculada a" arranca en la madre; pasarlo a "— ninguna —" desvincula
    await selectOption('Vinculada a', '');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(patchBody).toBeDefined());
    expect(patchBody).toMatchObject({ linkedAccountId: '' });
  });

  it('editar cuenta de crédito ya configurada precarga los días', () => {
    renderForm(creditAccount);

    expect(screen.getByLabelText('Día de cierre (1-28)', { exact: false })).toHaveValue(10);
    expect(screen.getByLabelText('Día de vencimiento (1-28)', { exact: false })).toHaveValue(20);
  });

  it('editar y cambiar un solo día manda LOS DOS juntos (atómico, no PATCH parcial)', async () => {
    let patchBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        if (options?.method === 'PATCH') {
          patchBody = JSON.parse(options.body as string);
          return ok({ ...creditAccount, ...patchBody });
        }
        return ok([]);
      }),
    );

    renderForm(creditAccount);

    fireEvent.change(screen.getByLabelText('Día de cierre (1-28)', { exact: false }), {
      target: { value: '12' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(patchBody).toBeDefined());
    // cambió sólo close, pero se mandan los dos (12 nuevo + 20 sin cambiar)
    expect(patchBody).toMatchObject({ statementCloseDay: 12, paymentDueDay: 20 });
  });

  it('editar sin tocar los días no manda campos de ciclo', async () => {
    let patchBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        if (options?.method === 'PATCH') {
          patchBody = JSON.parse(options.body as string);
          return ok({ ...creditAccount, ...patchBody });
        }
        return ok([]);
      }),
    );

    renderForm(creditAccount);

    fireEvent.change(screen.getByLabelText('Nombre', { exact: false }), { target: { value: 'Visa Gold' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(patchBody).toBeDefined());
    expect(patchBody).toMatchObject({ name: 'Visa Gold' });
    expect(patchBody).not.toHaveProperty('statementCloseDay');
    expect(patchBody).not.toHaveProperty('paymentDueDay');
  });
});
