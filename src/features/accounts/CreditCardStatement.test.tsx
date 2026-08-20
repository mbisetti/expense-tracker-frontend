import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { CreditCardStatement } from './CreditCardStatement';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ok } from '../../test/mockResponse';
import { selectOption, selectValue } from '../../test/selectOption';
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

// Sprint 27: el resumen es un ciclo (fechas + closed) con N renglones, uno por moneda.
function line(overrides?: Partial<Record<string, unknown>>) {
  return {
    currency: 'ARS',
    totalSpent: 5000,
    payments: 1000,
    closingBalance: -4000,
    paid: false,
    paidWithTransfer: false,
    remainingToPay: 4000,
    ...overrides,
  };
}

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
    // Sprint 22.4: por defecto, ciclo CERRADO con deuda pendiente (el widget muestra el tick).
    closed: true,
    lines: [line()],
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

// Los tests stubean fetch por URL: /auth/me devuelve la favorita, el resto el statement.
function fetchStub(statement: unknown, onMutation?: (url: string, o: RequestInit) => unknown) {
  return vi.fn((url: string, options?: RequestInit) => {
    if (options?.method && options.method !== 'GET') {
      return (onMutation?.(url, options) as ReturnType<typeof ok>) ?? ok({});
    }
    if (url.includes('/auth/me')) return ok({ defaultCurrency: 'ARS' });
    return ok(statement);
  });
}

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

// Sprint 27: los botones del widget nombran su renglón, así que con dos monedas hay dos ticks.
const TICK_ARS = 'Pagado · compras en pesos';
const CROSS_ARS = 'No pagado · compras en pesos';
const TICK_USD = 'Pagado · compras en dólares';

describe('CreditCardStatement', () => {
  it('colapsado por defecto: no muestra el detalle (ni consumos ni saldo al cierre)', async () => {
    vi.stubGlobal('fetch', fetchStub(statementFor(0)));

    renderStatement();

    // el header/toggle está siempre; el detalle (incluido el saldo al cierre) queda oculto
    expect(await screen.findByRole('button', { name: /Resumen del ciclo/ })).toBeInTheDocument();
    expect(screen.queryByText(/Consumos del ciclo:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Saldo al cierre:/)).not.toBeInTheDocument();
  });

  it('al expandir se ve el detalle; al volver a clickear se colapsa (reversible)', async () => {
    vi.stubGlobal('fetch', fetchStub(statementFor(0)));

    renderStatement();

    await expand();
    expect(await screen.findByText(/Consumos del ciclo:/)).toBeInTheDocument();

    // colapsar de nuevo
    fireEvent.click(screen.getByRole('button', { name: /Resumen del ciclo/ }));
    expect(screen.queryByText(/Consumos del ciclo:/)).not.toBeInTheDocument();
  });

  it('expandido: muestra consumos, pagos y saldo al cierre formateados', async () => {
    vi.stubGlobal('fetch', fetchStub(statementFor(0)));

    renderStatement();
    await expand();

    expect(await screen.findByText(/Consumos del ciclo:/)).toHaveTextContent('$ 5.000,00');
    expect(screen.getByText(/Pagos:/)).toHaveTextContent('$ 1.000,00');
    expect(screen.getByText(/Saldo al cierre:/)).toHaveTextContent('-$ 4.000,00');
  });

  it('vencimiento futuro se muestra en tono neutro como "Vence el"', async () => {
    vi.setSystemTime(new Date('2026-07-15T12:00:00'));
    vi.stubGlobal('fetch', fetchStub(statementFor(0, { dueDate: '2026-07-20' })));

    renderStatement();
    await expand();

    const dueText = await screen.findByText(/Vence el/);
    expect(dueText).not.toHaveClass('text-expense');
  });

  it('vencimiento pasado se muestra en text-expense como "Vencido el"', async () => {
    vi.setSystemTime(new Date('2026-07-25T12:00:00'));
    vi.stubGlobal('fetch', fetchStub(statementFor(0, { dueDate: '2026-07-20' })));

    renderStatement();
    await expand();

    const dueText = await screen.findByText(/Vencido el/);
    expect(dueText).toHaveClass('text-expense');
  });

  it('en offset 0, "Siguiente" está deshabilitado y "Anterior" habilitado', async () => {
    vi.stubGlobal('fetch', fetchStub(statementFor(0)));

    renderStatement();
    await expand();

    await screen.findByText(/Consumos del ciclo:/);
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Anterior/ })).not.toBeDisabled();
  });

  it('al hacer click en "Anterior" pide el ciclo con offset -1', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/auth/me')) return ok({ defaultCurrency: 'ARS' });
      if (url.includes('offset=-1'))
        return ok(statementFor(-1, { periodStart: '2026-05-11', periodEnd: '2026-06-10' }));
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
      if (url.includes('/auth/me')) return ok({ defaultCurrency: 'ARS' });
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
    vi.stubGlobal('fetch', fetchStub(statementFor(0, { closed: false })));

    renderStatement();
    await expand();

    expect(await screen.findByText(/El resumen cierra el/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: TICK_ARS })).not.toBeInTheDocument();
  });

  it('widget: cerrado sin deuda → "No hay nada que pagar"', async () => {
    vi.stubGlobal(
      'fetch',
      fetchStub(statementFor(0, { lines: [line({ closingBalance: 0, remainingToPay: 0 })] })),
    );

    renderStatement();
    await expand();

    expect(await screen.findByText(/No hay nada que pagar/)).toBeInTheDocument();
  });

  it('widget: suelta con deuda → tick abre confirmar-marca → PUT pay:false con la moneda', async () => {
    let putBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      fetchStub(statementFor(0), (_url, options) => {
        if (options.method === 'PUT') putBody = JSON.parse(options.body as string);
        return ok({});
      }),
    );

    renderStatement(); // sin madre → solo marca cosmética
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: TICK_ARS }));
    expect(await screen.findByText(/no mueve plata ni cambia tus saldos/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar' }));

    await waitFor(() =>
      expect(putBody).toEqual({ periodEnd: '2026-07-10', currency: 'ARS', pay: false }),
    );
  });

  it('widget: pagado cosmético → ✗ hace DELETE directo (sin diálogo)', async () => {
    let deleteUrl: string | undefined;
    vi.stubGlobal(
      'fetch',
      fetchStub(
        statementFor(0, { lines: [line({ paid: true, paidWithTransfer: false })] }),
        (url, options) => {
          if (options.method === 'DELETE') deleteUrl = url;
          return ok({});
        },
      ),
    );

    renderStatement();
    await expand();

    expect(await screen.findByRole('button', { name: TICK_ARS })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: CROSS_ARS }));

    await waitFor(() => expect(deleteUrl).toContain('periodEnd=2026-07-10'));
    expect(deleteUrl).toContain('currency=ARS');
    expect(screen.queryByText(/Deshacer el pago/)).not.toBeInTheDocument();
  });

  it('widget: pagado real → ✗ pide confirmación antes del DELETE', async () => {
    let deleteUrl: string | undefined;
    vi.stubGlobal(
      'fetch',
      fetchStub(
        statementFor(0, { lines: [line({ paid: true, paidWithTransfer: true })] }),
        (url, options) => {
          if (options.method === 'DELETE') deleteUrl = url;
          return ok({});
        },
      ),
    );

    renderStatement();
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: CROSS_ARS }));
    expect(await screen.findByText(/Se va a borrar la transferencia/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));

    await waitFor(() => expect(deleteUrl).toContain('periodEnd=2026-07-10'));
    expect(deleteUrl).toContain('currency=ARS');
  });

  it('widget: vinculada con deuda → "Pagar desde {madre}" hace PUT pay:true', async () => {
    let putBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      fetchStub(statementFor(0), (_url, options) => {
        if (options.method === 'PUT') putBody = JSON.parse(options.body as string);
        return ok({});
      }),
    );

    renderStatement(card, parentBank); // madre con saldo ARS suficiente
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: TICK_ARS }));
    fireEvent.click(await screen.findByRole('button', { name: /Pagar desde Banco Nación/ }));

    // Misma moneda: un solo monto, precargado con el restante (D6 — el caso normal es un tap).
    await waitFor(() =>
      expect(putBody).toEqual({
        periodEnd: '2026-07-10',
        currency: 'ARS',
        pay: true,
        amount: 4000,
      }),
    );
  });

  // ── Sprint 27: deuda multimoneda ─────────────────────────────────────────

  const dualStatement = statementFor(0, {
    lines: [line(), line({ currency: 'USD', totalSpent: 100, payments: 0, closingBalance: -100, remainingToPay: 100 })],
  });

  // Madre mixta con pesos de sobra: pagar US$100 en pesos cuesta ~$150.000, así que con los
  // $100.000 de `parentBank` el guard de saldo se dispararía antes que el pago.
  const parentMixed: Account = {
    ...parentBank,
    balances: [
      { currency: 'ARS', balance: 1000000 },
      { currency: 'USD', balance: 500 },
    ],
  };

  // D9: "Compras en pesos" / "Compras en dólares", NO "Deuda en". El resumen del banco muestra
  // un total a pagar en pesos que incluye los dólares convertidos y los impuestos; estos son
  // otros números a propósito, y el naming es lo que evita que el usuario crea que la app falla.
  it('dos monedas → dos renglones con el naming de D9', async () => {
    vi.stubGlobal('fetch', fetchStub(dualStatement));

    renderStatement(card, parentMixed);
    await expand();

    expect(await screen.findByText('Compras en pesos')).toBeInTheDocument();
    expect(screen.getByText('Compras en dólares')).toBeInTheDocument();
    expect(screen.queryByText(/Deuda en/)).not.toBeInTheDocument();
    // el vencimiento es del ciclo: se dice UNA vez aunque haya dos renglones
    expect(screen.getAllByText(/Vence el|Vencido el/)).toHaveLength(1);
  });

  it('cada renglón tiene su propio tick: marcar los dólares manda currency USD', async () => {
    let putBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      fetchStub(dualStatement, (_url, options) => {
        if (options.method === 'PUT') putBody = JSON.parse(options.body as string);
        return ok({});
      }),
    );

    renderStatement(); // suelta → marca cosmética
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: TICK_USD }));
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar' }));

    await waitFor(() =>
      expect(putBody).toEqual({ periodEnd: '2026-07-10', currency: 'USD', pay: false }),
    );
  });

  // D3/FR-4: la app NO calcula el tipo de cambio, lo REGISTRA. El usuario escribe cuánto sale
  // de la cuenta y cuánta deuda cancela; entre los dos quedan absorbidos el spread del banco y
  // los impuestos, que dependen de cómo pagues y que la app no puede conocer.
  it('pago cross-currency: elegir los pesos de la madre pide los DOS montos y los manda', async () => {
    let putBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      'fetch',
      fetchStub(dualStatement, (_url, options) => {
        if (options.method === 'PUT') putBody = JSON.parse(options.body as string);
        return ok({});
      }),
    );

    renderStatement(card, parentMixed);
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: TICK_USD }));

    // el default es USD→USD (la madre tiene dólares): un solo monto
    expect(screen.queryByLabelText(/Sale de la cuenta/)).not.toBeInTheDocument();

    // pasar a pagar desde los pesos → aparece el segundo monto
    await selectOption(/Con qué plata de/, 'ARS');
    const sale = await screen.findByLabelText(/Sale de la cuenta \(ARS\)/);
    fireEvent.change(sale, { target: { value: '150000' } });

    fireEvent.click(screen.getByRole('button', { name: /Pagar desde Banco Nación/ }));

    await waitFor(() =>
      expect(putBody).toEqual({
        periodEnd: '2026-07-10',
        currency: 'USD',
        pay: true,
        fromCurrency: 'ARS',
        fromAmount: 150000,
        amount: 100,
      }),
    );
  });

  // El guard de saldo mira lo que SALE de la cuenta, no lo que se cancela: en un pago
  // cross-currency son números distintos, y comparar contra el equivocado dejaría pasar un pago
  // que la madre no puede cubrir (o frenaría uno que sí).
  it('cross-currency sin saldo suficiente en la moneda de origen: avisa y no manda el PUT', async () => {
    const fetchMock = fetchStub(dualStatement);
    vi.stubGlobal('fetch', fetchMock);

    // pesos justos: alcanzan para el monto que se cancela (100) pero no para el que sale
    const parentTightArs: Account = {
      ...parentBank,
      balances: [{ currency: 'ARS', balance: 1000 }],
    };
    renderStatement(card, parentTightArs);
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: TICK_USD }));
    fireEvent.change(await screen.findByLabelText(/Sale de la cuenta \(ARS\)/), {
      target: { value: '150000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Pagar desde Banco Nación/ }));

    expect(await screen.findByText(/no alcanza/)).toBeInTheDocument();
    const puts = fetchMock.mock.calls.filter(
      ([, o]) => (o as RequestInit | undefined)?.method === 'PUT',
    );
    expect(puts).toHaveLength(0);
  });

  // D6: si la madre NO tiene la moneda del renglón, el selector arranca en la que sí tiene —
  // que es exactamente el caso de pagar los dólares desde los pesos. Antes de S27 esto era un
  // callejón sin salida ("no trabajamos con pagos en otra moneda todavía").
  it('madre sin la moneda del renglón: el selector arranca en la que sí tiene', async () => {
    vi.stubGlobal('fetch', fetchStub(statementFor(0)));

    const parentUsd: Account = { ...parentBank, balances: [{ currency: 'USD', balance: 500 }] };
    renderStatement(card, parentUsd); // la tarjeta debe ARS y la madre solo tiene USD
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: TICK_ARS }));

    await screen.findByLabelText(/Con qué plata de/);
    expect(selectValue(/Con qué plata de/)).toBe('USD');
    expect(screen.getByLabelText(/Sale de la cuenta \(USD\)/)).toBeInTheDocument();
  });

  // D8/FR-6: pagar de más no se bloquea, se avisa — y el excedente NO baja la otra moneda.
  it('pagar de más avisa que queda saldo a favor en esa moneda', async () => {
    vi.stubGlobal('fetch', fetchStub(dualStatement));

    renderStatement(card, parentMixed);
    await expand();

    fireEvent.click(await screen.findByRole('button', { name: TICK_USD }));
    fireEvent.change(screen.getByLabelText(/Cancela de la deuda/), { target: { value: '150' } });

    expect(await screen.findByText(/queda con saldo a favor en dólares/)).toBeInTheDocument();
    expect(screen.getByText(/No baja la deuda de las otras monedas/)).toBeInTheDocument();
  });

  // El aviso del renglón ya pagado de más lleva a los movimientos para ver dónde se pifió.
  it('renglón con saldo a favor: el aviso enlaza a los movimientos de la tarjeta', async () => {
    vi.stubGlobal(
      'fetch',
      fetchStub(
        statementFor(0, { lines: [line({ closingBalance: 500, remainingToPay: 0 })] }),
      ),
    );

    renderStatement();
    await expand();

    const link = await screen.findByRole('link', { name: /Pagaste de más/ });
    expect(link).toHaveAttribute('href', '/transactions?accountId=acc-3');
  });

  it('ciclo sin movimientos: no se inventan renglones en cero', async () => {
    vi.stubGlobal('fetch', fetchStub(statementFor(0, { lines: [] })));

    renderStatement();
    await expand();

    expect(await screen.findByText(/No hubo movimientos en este ciclo/)).toBeInTheDocument();
    expect(screen.queryByText(/Compras en/)).not.toBeInTheDocument();
  });
});
