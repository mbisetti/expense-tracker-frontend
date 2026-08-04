import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { StatementPreviewModal } from './StatementPreviewModal';
import type {
  CurrencyCheck,
  StatementConfirmPayload,
  StatementReport,
  StatementRowResult,
} from './statementApi';
import type { StatementUpload } from './useStatementImport';

// S37 §10 (frontend): barra de validación en verde y en rojo, checkbox por fila, CTA
// deshabilitada cuando no cierra, bloque de nombres nuevos y desglose por titular.

const ACCOUNTS = [
  { id: 'acc-1', name: 'Mercado Pago', type: 'WALLET', currency: 'ARS', balance: 0 },
  { id: 'acc-2', name: 'Banco Galicia', type: 'BANK', currency: 'ARS', balance: 0 },
];

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const body = url.includes('/accounts') ? ACCOUNTS : [{ id: 'p-1', name: 'Bauti' }];
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

function row(overrides: Partial<StatementRowResult> = {}): StatementRowResult {
  return {
    id: 'r1',
    section: 'MOVEMENTS',
    status: 'OK',
    date: '2026-06-05',
    originalDate: null,
    description: 'Pago con QR Super',
    externalRef: '4000000000005',
    amount: 45000,
    currency: 'ARS',
    type: 'EXPENSE',
    categoryId: null,
    paymentMethodId: null,
    categoryName: null,
    categorySource: null,
    installmentNumber: null,
    installmentTotal: null,
    holderKey: null,
    detectedName: null,
    needsPersonLink: false,
    personId: null,
    personName: null,
    settlesShare: false,
    ownTransferAccountId: null,
    sharedAmount: null,
    pairedWithId: null,
    collapsedCount: 1,
    duplicate: false,
    selected: true,
    issues: [],
    ...overrides,
  };
}

function check(overrides: Partial<CurrencyCheck> = {}): CurrencyCheck {
  return {
    currency: 'ARS',
    label: 'saldo del extracto',
    expected: 15000,
    computed: 15000,
    difference: 0,
    ok: true,
    documentInconsistency: false,
    message: 'Cierra al centavo contra el saldo del extracto en ARS.',
    ...overrides,
  };
}

function report(overrides: Partial<StatementReport> = {}): StatementReport {
  return {
    dryRun: true,
    sourceKind: 'ACCOUNT_STATEMENT',
    summary: 'Leí el extracto de Mercado Pago, período del 01/06 al 30/06. 3 movimientos, y las cuentas cierran.',
    detected: {
      issuer: 'Extracto de cuenta',
      holderName: null,
      accountNumber: '0000003100036406322440',
      cardLast4: null,
      statementNumber: null,
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
    },
    accountMatch: 'MATCH',
    accountMatchMessage: null,
    checks: [check()],
    checksPass: true,
    holders: [],
    cycle: null,
    pendingNames: [],
    directDebit: null,
    sections: [
      { key: 'MOVEMENTS', label: 'Movimientos', note: null, selectedByDefault: true, rows: [row()] },
    ],
    totalRows: 1,
    selectedRows: 1,
    errorCount: 0,
    duplicateCount: 0,
    imported: 0,
    batchId: null,
    ...overrides,
  };
}

const UPLOAD: StatementUpload = {
  kind: 'ACCOUNT_STATEMENT',
  file: new File(['x'], 'extracto.pdf', { type: 'application/pdf' }),
  accountId: 'acc-1',
};

function renderModal(
  data: StatementReport,
  onConfirm: (payload: StatementConfirmPayload) => void = () => undefined,
) {
  stubFetch();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <MemoryRouter>
            <StatementPreviewModal
              open
              report={data}
              upload={UPLOAD}
              onClose={() => undefined}
              onConfirm={onConfirm}
              isImporting={false}
            />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('StatementPreviewModal', () => {
  it('muestra arriba de todo lo que se leyó, antes de cualquier tabla (D15)', () => {
    renderModal(report());
    expect(screen.getByText(/Leí el extracto de Mercado Pago/)).toBeInTheDocument();
    expect(screen.getByText(/período del 01\/06 al 30\/06/)).toBeInTheDocument();
  });

  it('en verde cuando cierra, y deja importar', () => {
    renderModal(report());
    expect(screen.getByText('Cierra al centavo contra el saldo del extracto en ARS.'))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Importar 1 movimiento/ })).toBeEnabled();
  });

  it('en rojo cuando no cierra, con el desvío exacto, y la CTA queda deshabilitada (D4)', () => {
    renderModal(
      report({
        checksPass: false,
        checks: [
          check({
            ok: false,
            computed: 60000,
            difference: 45000,
            message: 'No cierra en ARS: leí 60000,00 y el papel dice 15000,00 (desvío de 45000,00).',
          }),
        ],
      }),
    );

    expect(screen.getByText(/desvío de 45000,00/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Importar/ })).toBeDisabled();
  });

  it('con el override explícito se habilita igual', () => {
    renderModal(
      report({ checksPass: false, checks: [check({ ok: false, difference: 45000 })] }),
    );

    expect(screen.getByRole('button', { name: /Importar/ })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Importar igual, revisé las filas'));
    expect(screen.getByRole('button', { name: /Importar/ })).toBeEnabled();
  });

  it('un desvío del propio documento avisa pero NO bloquea', () => {
    // Pasa de verdad con la plantilla A de Mercado Pago: sus secciones cierran al centavo y las
    // cajas de la cabecera no cierran entre sí.
    renderModal(
      report({
        checksPass: true,
        checks: [
          check({
            ok: false,
            documentInconsistency: true,
            difference: 552.36,
            message: 'Las cajas del resumen no cierran entre sí por 552,36. Las filas sí cuadran.',
          }),
        ],
      }),
    );

    expect(screen.getByText(/no cierran entre sí por 552,36/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Importar/ })).toBeEnabled();
  });

  it('checkbox por fila: destildar una baja el contador de la CTA (D12)', () => {
    renderModal(
      report({
        sections: [
          {
            key: 'MOVEMENTS',
            label: 'Movimientos',
            note: null,
            selectedByDefault: true,
            rows: [row(), row({ id: 'r2', description: 'Pago SUBE', amount: 10000 })],
          },
        ],
        totalRows: 2,
        selectedRows: 2,
      }),
    );

    expect(screen.getByRole('button', { name: /Importar 2 movimientos/ })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Importar Pago SUBE'));
    expect(screen.getByRole('button', { name: /Importar 1 movimiento/ })).toBeInTheDocument();
  });

  it('los nombres nuevos frenan el import hasta que se decidan (D14)', () => {
    renderModal(
      report({
        pendingNames: [
          {
            alias: 'bautista honorio codegoni',
            rawAlias: 'Bautista Honorio Codegoni',
            suggestedPersonId: null,
            suggestedPersonName: null,
            rowCount: 1,
            totals: [{ currency: 'ARS', amount: 59200 }],
          },
        ],
      }),
    );

    expect(screen.getByText('Nombres nuevos (1)')).toBeInTheDocument();
    expect(screen.getByText('Bautista Honorio Codegoni')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Importar/ })).toBeDisabled();

    // "No es una persona" también es una decisión: se recuerda y desbloquea.
    fireEvent.click(screen.getByRole('button', { name: 'No es una persona' }));
    expect(screen.getByRole('button', { name: /Importar/ })).toBeEnabled();
  });

  it('un import sin nombres nuevos no muestra el bloque', () => {
    renderModal(report());
    expect(screen.queryByText(/Nombres nuevos/)).not.toBeInTheDocument();
  });

  it('si el archivo no es de la cuenta elegida, exige confirmar antes de importar (D15)', () => {
    renderModal(
      report({
        accountMatch: 'MISMATCH',
        accountMatchMessage: 'Elegiste "Visa 6180". El archivo dice tarjeta ····8864.',
      }),
    );

    expect(screen.getByText(/El archivo dice tarjeta ····8864/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Importar/ })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Ya lo revisé: el archivo es de esta cuenta'));
    expect(screen.getByRole('button', { name: /Importar/ })).toBeEnabled();
  });

  it('el desglose por titular muestra sus totales y su interruptor (D5)', () => {
    renderModal(
      report({
        sourceKind: 'CARD_STATEMENT',
        holders: [
          {
            key: 'h1',
            name: 'MARKO BISETTI',
            cardLast4: '6180',
            totals: [
              { currency: 'ARS', amount: 59356.15 },
              { currency: 'USD', amount: 3.04 },
            ],
            mode: 'OWN',
            personId: null,
            rowCount: 4,
          },
        ],
      }),
    );

    expect(screen.getByText('Titulares')).toBeInTheDocument();
    expect(screen.getByText(/MARKO BISETTI/)).toBeInTheDocument();
    expect(screen.getByText(/····6180/)).toBeInTheDocument();
  });

  it('las secciones plegables muestran su nota y se abren y cierran', () => {
    renderModal(
      report({
        sections: [
          { key: 'MOVEMENTS', label: 'Movimientos', note: null, selectedByDefault: true, rows: [row()] },
          {
            key: 'TAXES',
            label: 'Impuestos y percepciones',
            note: 'Entran desmarcados: todavía no está definido si el total a pagar ya los incluye.',
            selectedByDefault: false,
            rows: [row({ id: 'r9', section: 'TAXES', description: 'Impuesto de Sellos', selected: false })],
          },
        ],
      }),
    );

    expect(screen.getByText(/Entran desmarcados/)).toBeInTheDocument();
    // Arranca cerrada porque su default es desmarcado. S38: la descripción es una celda editable,
    // así que se busca por su valor y no por texto suelto.
    expect(screen.queryByDisplayValue('Impuesto de Sellos')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Impuestos y percepciones (1)'));
    expect(screen.getByDisplayValue('Impuesto de Sellos')).toBeInTheDocument();
  });

  it('S38: la planilla edita descripción y categoría en la fila, y eso es lo que se manda', () => {
    const onConfirm = vi.fn();
    renderModal(report(), onConfirm);

    fireEvent.change(screen.getByLabelText('Descripción de Pago con QR Super'), {
      target: { value: 'Supermercado del barrio' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Importar 1 movimiento/ }));

    const payload = onConfirm.mock.calls[0][0] as StatementConfirmPayload;
    expect(payload.rows[0].description).toBe('Supermercado del barrio');
  });

  it('S38: el monto y la fecha NO se editan, porque la validación se calcula contra ellos', () => {
    renderModal(report());

    expect(screen.queryByLabelText(/Monto de/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Fecha de/)).not.toBeInTheDocument();
    // Y siguen a la vista, que es lo que hace falta para controlar contra el papel.
    expect(screen.getByText(/45\.000,00/)).toBeInTheDocument();
  });

  it('el confirm manda las filas revisadas, no las originales (D12)', () => {
    const onConfirm = vi.fn();
    renderModal(
      report({
        sections: [
          {
            key: 'MOVEMENTS',
            label: 'Movimientos',
            note: null,
            selectedByDefault: true,
            rows: [row(), row({ id: 'r2', description: 'Pago SUBE' })],
          },
        ],
      }),
      onConfirm,
    );

    fireEvent.click(screen.getByLabelText('Importar Pago SUBE'));
    fireEvent.click(screen.getByRole('button', { name: /Importar 1 movimiento/ }));

    const payload = onConfirm.mock.calls[0][0] as StatementConfirmPayload;
    expect(payload.rows).toHaveLength(2);
    expect(payload.rows.find((r) => r.id === 'r2')?.selected).toBe(false);
    expect(payload.rows.find((r) => r.id === 'r1')?.selected).toBe(true);
    expect(payload.accountId).toBe('acc-1');
  });
});
