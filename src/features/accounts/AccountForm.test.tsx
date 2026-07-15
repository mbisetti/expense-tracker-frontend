import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { AccountForm } from './AccountForm';
import { ok } from '../../test/mockResponse';
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
};

function renderForm(account?: Account) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <AccountForm account={account} onClose={() => {}} />
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

  it('al elegir tipo Crédito aparecen los inputs de ciclo', () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'CREDIT' } });

    expect(screen.getByLabelText('Día de cierre (1-28)')).toBeInTheDocument();
    expect(screen.getByLabelText('Día de vencimiento (1-28)')).toBeInTheDocument();
  });

  it('alta de tarjeta con ambos días completos los manda atómicamente', async () => {
    let postedBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          postedBody = JSON.parse(options.body as string);
          return ok({ ...creditAccount, ...postedBody, id: 'acc-new' });
        }
        return ok([]);
      }),
    );

    renderForm();

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Visa' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'CREDIT' } });
    fireEvent.change(screen.getByLabelText('Moneda (código de 3 letras)'), {
      target: { value: 'ARS' },
    });
    fireEvent.change(screen.getByLabelText('Día de cierre (1-28)'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Día de vencimiento (1-28)'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(postedBody).toBeDefined());
    expect(postedBody).toMatchObject({ statementCloseDay: 10, paymentDueDay: 20 });
  });

  it('los inputs de ciclo son required para CREDIT (atomicidad: no hay alta parcial)', () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'CREDIT' } });

    // required fuerza el par completo: el navegador no deja submitear con uno solo,
    // así el form nunca produce un payload parcial ni un "blanquear = no-op".
    expect(screen.getByLabelText('Día de cierre (1-28)')).toBeRequired();
    expect(screen.getByLabelText('Día de vencimiento (1-28)')).toBeRequired();
  });

  it('editar cuenta de crédito ya configurada precarga los días', () => {
    renderForm(creditAccount);

    expect(screen.getByLabelText('Día de cierre (1-28)')).toHaveValue(10);
    expect(screen.getByLabelText('Día de vencimiento (1-28)')).toHaveValue(20);
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

    fireEvent.change(screen.getByLabelText('Día de cierre (1-28)'), { target: { value: '12' } });
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

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Visa Gold' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => expect(patchBody).toBeDefined());
    expect(patchBody).toMatchObject({ name: 'Visa Gold' });
    expect(patchBody).not.toHaveProperty('statementCloseDay');
    expect(patchBody).not.toHaveProperty('paymentDueDay');
  });
});
