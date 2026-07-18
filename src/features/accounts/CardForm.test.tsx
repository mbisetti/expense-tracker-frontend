import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { CardForm } from './CardForm';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ok } from '../../test/mockResponse';
import type { Account } from './api';

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

function renderCardForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <CardForm account={bank} onClose={() => {}} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CardForm', () => {
  it('débito: crea un PaymentMethod DEBIT de la cuenta madre', async () => {
    let postUrl: string | undefined;
    let postBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          postUrl = url;
          postBody = JSON.parse(options.body as string);
          return ok({ id: 'pm-new', ...postBody });
        }
        return ok([]);
      }),
    );

    renderCardForm();

    fireEvent.change(screen.getByLabelText('Nombre', { exact: false }), {
      target: { value: 'Visa *4160' },
    });
    // tipo default = Débito
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(postBody).toBeDefined());
    expect(postUrl).toContain('/payment-methods');
    expect(postBody).toMatchObject({
      accountId: 'bank-1',
      name: 'Visa *4160',
      type: 'DEBIT',
    });
  });

  it('crédito: crea una cuenta CREDIT hija con vínculo y ciclo', async () => {
    let postUrl: string | undefined;
    let postBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          postUrl = url;
          postBody = JSON.parse(options.body as string);
          return ok({ ...bank, id: 'acc-new', ...postBody });
        }
        return ok([]);
      }),
    );

    renderCardForm();

    fireEvent.change(screen.getByLabelText('Nombre', { exact: false }), {
      target: { value: 'Visa *8190' },
    });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'CREDIT' } });
    fireEvent.change(screen.getByLabelText('Día de cierre (1-28)', { exact: false }), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText('Día de vencimiento (1-28)', { exact: false }), {
      target: { value: '20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(postBody).toBeDefined());
    expect(postUrl).toContain('/accounts');
    expect(postBody).toMatchObject({
      name: 'Visa *8190',
      type: 'CREDIT',
      currency: 'ARS',
      statementCloseDay: 10,
      paymentDueDay: 20,
      linkedAccountId: 'bank-1',
    });
  });
});
