import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { AdjustValueDialog } from './AdjustValueDialog';
import { jsonResponse } from '../../test/mockResponse';
import type { Account, AccountType } from './api';

function account(type: AccountType, balance: number): Account {
  return {
    id: 'a1',
    name: type === 'DEBT' ? 'Préstamo' : 'Balanz',
    type,
    currency: 'ARS',
    balance,
    isInformal: false,
    createdAt: '2026-01-01T00:00:00',
    statementCloseDay: null,
    paymentDueDay: null,
    balances: [{ currency: 'ARS', balance }],
    institution: null,
    linkedAccountId: null,
  };
}

afterEach(() => vi.unstubAllGlobals());

function renderDialog(acc: Account, onConfirm = vi.fn()) {
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, { defaultCurrency: 'ARS' })));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        <AdjustValueDialog account={acc} onConfirm={onConfirm} onCancel={() => {}} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return onConfirm;
}

describe('AdjustValueDialog (S40 D2)', () => {
  it('pregunta cuánto VALE hoy y previsualiza la diferencia que se va a registrar', () => {
    renderDialog(account('INVESTMENT', 100000));

    expect(screen.getByText('Vale ahora')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/¿Cuánto vale hoy\?/), {
      target: { value: '112300' },
    });

    // La aritmética la hace el código, no el usuario: 112.300 − 100.000.
    expect(screen.getByText(/\+.*12\.300/)).toBeInTheDocument();
  });

  it('manda el VALOR, no el delta: el server calcula la diferencia', () => {
    const onConfirm = renderDialog(account('INVESTMENT', 100000));

    fireEvent.change(screen.getByLabelText(/¿Cuánto vale hoy\?/), {
      target: { value: '112300' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onConfirm).toHaveBeenCalledWith({ currency: 'ARS', currentValue: 112300 });
  });

  it('en una deuda el copy cambia y el monto se ingresa POSITIVO', () => {
    // El saldo vive negativo en el ledger; nadie piensa su deuda en números negativos.
    const onConfirm = renderDialog(account('DEBT', -100000));

    expect(screen.getByText('Debés ahora')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/¿Cuánto debés hoy\?/), {
      target: { value: '103000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onConfirm).toHaveBeenCalledWith({ currency: 'ARS', currentValue: 103000 });
  });

  it('sin cambio avisa que no se registra nada', () => {
    renderDialog(account('INVESTMENT', 100000));

    // Arranca precargado con el valor actual: el delta es 0.
    expect(screen.getByText('El valor no cambió: no se registra nada.')).toBeInTheDocument();
  });

  it('el copy explica por qué el mes no se mueve', () => {
    renderDialog(account('INVESTMENT', 100000));

    expect(
      screen.getByText(/no como ingreso del mes: que suba la valuación no te puso un peso/),
    ).toBeInTheDocument();
  });

  // S46 (D5): el mismo diálogo abierto desde una caja de ahorro. En el banco no se pregunta
  // cuánto VALE algo (nada se mueve solo ahí): se pregunta cuánta plata hay.
  it('S46: en una cuenta común pregunta cuánta plata hay hoy', () => {
    const onConfirm = renderDialog(account('BANK', 0));

    expect(screen.getByText('Tenés ahora')).toBeInTheDocument();
    expect(screen.queryByText('Vale ahora')).not.toBeInTheDocument();
    expect(
      screen.getByText(/no cuenta como ingreso del mes: decir cuánta plata tenés no es haber cobrado/),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/¿Cuánto tenés hoy\?/), {
      target: { value: '500000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onConfirm).toHaveBeenCalledWith({ currency: 'ARS', currentValue: 500000 });
  });
});

// ── S43 (D7): la sugerencia de mercado ──────────────────────────────────────────────────────

describe('AdjustValueDialog — sugerencia de mercado (S43 D7)', () => {
  function renderWithSuggestion(suggestedValue: number | null) {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, { defaultCurrency: 'ARS' })));
    const onConfirm = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
        >
          <AdjustValueDialog
            account={account('CRYPTO', 100000)}
            suggestedValue={suggestedValue}
            onConfirm={onConfirm}
            onCancel={() => {}}
          />
        </AuthContext.Provider>
      </QueryClientProvider>,
    );
    return onConfirm;
  }

  it('ofrece el valor de mercado y lo pone en el input de un tap', () => {
    const onConfirm = renderWithSuggestion(114000);

    expect(screen.getByText(/Según mercado hoy/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Usar este valor' }));

    // Un tap LLENA el input; no confirma nada. El usuario sigue viendo y apretando Guardar.
    expect(screen.getByLabelText(/¿Cuánto vale hoy\?/)).toHaveValue('114.000');
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onConfirm).toHaveBeenCalledWith({ currency: 'ARS', currentValue: 114000 });
  });

  it('sin sugerencia el diálogo queda EXACTAMENTE como lo dejó S40', () => {
    renderWithSuggestion(null);

    expect(screen.queryByText(/Según mercado hoy/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usar este valor' })).not.toBeInTheDocument();
    // Y lo de siempre sigue estando.
    expect(screen.getByLabelText(/¿Cuánto vale hoy\?/)).toBeInTheDocument();
  });
});
