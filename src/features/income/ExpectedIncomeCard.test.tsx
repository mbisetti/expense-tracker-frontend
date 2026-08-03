import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ExpectedIncomeCard } from './ExpectedIncomeCard';
import { jsonResponse, ok } from '../../test/mockResponse';

const fail = () => jsonResponse(500, { error: 'INTERNAL', message: 'boom' });

// S36: la fuente ya no trae un booleano `received` sino dos contadores — la expectativa nunca
// fue un sí/no y modelarla así hacía desaparecer la segunda quincena (BUG-1).
function source(overrides: Record<string, unknown> = {}) {
  return {
    sourceId: 's1',
    name: 'Sueldo',
    currency: 'ARS',
    expectedAmount: 500000,
    billingDay: 5,
    dueMonth: null,
    frequency: 'MONTHLY',
    expectedCount: 1,
    receivedCount: 0,
    lastEntryId: null,
    ...overrides,
  };
}

function renderCard(autoConfirmSourceId?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <ExpectedIncomeCard autoConfirmSourceId={autoConfirmSourceId} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return container;
}

// El confirm abre cuentas y recientes además de los esperados.
function stubExpected(payload: unknown, extra?: { onPost?: (body: unknown) => void; onDelete?: (url: string) => void }) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      const url = String(input);
      if (url.includes('/income-entries') && requestInit?.method === 'POST') {
        extra?.onPost?.(JSON.parse(requestInit.body as string));
        return ok({ id: 'e9', currency: 'ARS', accountBalance: 999 });
      }
      if (url.includes('/income-entries') && requestInit?.method === 'DELETE') {
        extra?.onDelete?.(url);
        return ok(null);
      }
      if (url.includes('/summary/expected-income')) return ok(payload);
      if (url.includes('/income-entries')) {
        return ok({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
      }
      if (url.includes('/accounts')) {
        return ok([
          { id: 'acc1', name: 'Banco', type: 'BANK', currency: 'ARS', balance: 0, createdAt: '2026-01-01T00:00:00' },
        ]);
      }
      throw new Error('URL inesperada: ' + url);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('ExpectedIncomeCard', () => {
  it('sin fuentes recurrentes no renderiza nada', async () => {
    stubExpected({ month: 7, year: 2026, byCurrency: [], sources: [] });

    const container = renderCard();

    // esperamos a que la query resuelva; después no debería haber contenido
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByText('Ingresos esperados del mes')).not.toBeInTheDocument();
  });

  it('fuente pendiente con billingDay ya pasado se resalta como "no cargado"', async () => {
    vi.setSystemTime(new Date(2026, 6, 15)); // 15 de julio de 2026
    stubExpected({
      month: 7,
      year: 2026,
      byCurrency: [{ currency: 'ARS', expectedTotal: 500000, pendingTotal: 500000, pendingCount: 1 }],
      sources: [source()],
    });

    renderCard();

    expect(await screen.findByText('Sueldo')).toBeInTheDocument();
    expect(screen.getByText('Sin cargar')).toBeInTheDocument();
  });

  it('fuente recibida muestra "cargado" y no se resalta', async () => {
    vi.setSystemTime(new Date(2026, 6, 15));
    stubExpected({
      month: 7,
      year: 2026,
      byCurrency: [{ currency: 'ARS', expectedTotal: 500000, pendingTotal: 0, pendingCount: 0 }],
      sources: [source({ receivedCount: 1, lastEntryId: 'e1' })],
    });

    renderCard();

    expect(await screen.findByText('Cargado')).toBeInTheDocument();
    expect(screen.queryByText('Sin cargar')).not.toBeInTheDocument();
  });

  it('fuente pendiente con billingDay futuro no se resalta como vencida', async () => {
    vi.setSystemTime(new Date(2026, 6, 15));
    stubExpected({
      month: 7,
      year: 2026,
      byCurrency: [{ currency: 'ARS', expectedTotal: 300000, pendingTotal: 300000, pendingCount: 1 }],
      sources: [source({ sourceId: 's2', name: 'Freelance', expectedAmount: 300000, billingDay: 20 })],
    });

    renderCard();

    expect(await screen.findByText('Freelance')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.queryByText('Sin cargar')).not.toBeInTheDocument();
  });

  it('muestra error si falla el fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(() => fail()));

    renderCard();

    expect(
      await screen.findByText('No pudimos cargar los ingresos esperados. Intentá de nuevo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // ── S36 ────────────────────────────────────────────────────────────────────

  it('FR-5: una quincenal con un cobro cargado sigue pendiente y muestra "1 de 2"', async () => {
    vi.setSystemTime(new Date(2026, 6, 15));
    stubExpected({
      month: 7,
      year: 2026,
      byCurrency: [{ currency: 'ARS', expectedTotal: 800000, pendingTotal: 400000, pendingCount: 1 }],
      sources: [
        source({
          name: 'Sueldo quincenal',
          frequency: 'BIWEEKLY',
          expectedAmount: 400000,
          expectedCount: 2,
          receivedCount: 1,
          lastEntryId: 'e1',
        }),
      ],
    });

    renderCard();

    expect(await screen.findByText('Sueldo quincenal')).toBeInTheDocument();
    expect(screen.getByText('Parcial 1/2')).toBeInTheDocument();
    // sigue reclamando la segunda quincena, no dice "Cargado"
    expect(screen.getByRole('button', { name: 'Confirmar Sueldo quincenal' })).toBeInTheDocument();
    expect(screen.queryByText('Cargado')).not.toBeInTheDocument();
  });

  it('FR-1/D1: el tick abre un confirm con el monto esperado precargado y editable', async () => {
    vi.setSystemTime(new Date(2026, 6, 15));
    let posted: unknown;
    stubExpected(
      {
        month: 7,
        year: 2026,
        byCurrency: [{ currency: 'ARS', expectedTotal: 500000, pendingTotal: 500000, pendingCount: 1 }],
        sources: [source()],
      },
      { onPost: (body) => { posted = body; } },
    );

    renderCard();

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar Sueldo' }));

    const gross = await screen.findByLabelText('Monto bruto', { exact: false });
    expect(gross).toHaveValue('500.000');

    // el caso normal es que el real difiera del esperado: se corrige acá, no después
    fireEvent.change(gross, { target: { value: '480000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(posted).toBeTruthy());
    expect(posted).toMatchObject({ incomeSourceId: 's1', grossAmount: 480000 });
  });

  it('FR-2/D2: deshacer pide confirmación y borra la entry cargada', async () => {
    vi.setSystemTime(new Date(2026, 6, 15));
    let deletedUrl: string | undefined;
    stubExpected(
      {
        month: 7,
        year: 2026,
        byCurrency: [{ currency: 'ARS', expectedTotal: 500000, pendingTotal: 0, pendingCount: 0 }],
        sources: [source({ receivedCount: 1, lastEntryId: 'e1' })],
      },
      { onDelete: (url) => { deletedUrl = url; } },
    );

    renderCard();

    fireEvent.click(await screen.findByRole('button', { name: 'Deshacer Sueldo' }));
    expect(
      await screen.findByText(
        'Se borra el ingreso cargado y su movimiento. El saldo de la cuenta vuelve atrás.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer', hidden: true }));

    await waitFor(() => expect(deletedUrl).toContain('/income-entries/e1'));
  });

  it('FR-7: el deep-link de la notificación abre el confirm de esa fuente', async () => {
    vi.setSystemTime(new Date(2026, 6, 15));
    stubExpected({
      month: 7,
      year: 2026,
      byCurrency: [{ currency: 'ARS', expectedTotal: 500000, pendingTotal: 500000, pendingCount: 1 }],
      sources: [source()],
    });

    renderCard('s1');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByLabelText('Confirmar ingreso')).toBeInTheDocument();
  });

  it('FR-6: una anual fuera de su mes no reclama nada', async () => {
    vi.setSystemTime(new Date(2026, 6, 15));
    stubExpected({
      month: 7,
      year: 2026,
      byCurrency: [{ currency: 'USD', expectedTotal: 0, pendingTotal: 0, pendingCount: 0 }],
      sources: [
        source({
          name: 'Dividendos',
          currency: 'USD',
          frequency: 'ANNUAL',
          dueMonth: 3,
          expectedCount: 0,
          receivedCount: 0,
        }),
      ],
    });

    renderCard();

    expect(await screen.findByText('No vence este mes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar Dividendos' })).not.toBeInTheDocument();
  });
});
