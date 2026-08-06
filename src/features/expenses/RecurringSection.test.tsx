import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { RecurringSection } from './RecurringSection';
import { jsonResponse } from '../../test/mockResponse';
import type { CurrencyExpenses, RecurringExpense, RecurringItem } from './api';

const item1: RecurringItem = {
  id: 'r1', name: 'Alquiler', amount: 50000, frequency: 'MONTHLY', billingDay: 1, weekday: null,
  dueMonth: null, state: 'PENDING', expectedCount: 1, paidCount: 0, installmentsPaid: 0,
  installmentsTotal: null, cashPrice: null, isEssential: true, categoryId: 'c1', categoryName: 'Vivienda',
  autoDebit: false, debitAccountId: null, failedCount: 0,
};
const item2: RecurringItem = {
  id: 'r2', name: 'Streaming', amount: 6000, frequency: 'BIWEEKLY', billingDay: 5, weekday: null,
  dueMonth: null, state: 'PARTIAL', expectedCount: 2, paidCount: 1, installmentsPaid: 0,
  installmentsTotal: null, cashPrice: null, isEssential: false, categoryId: 'c2', categoryName: 'Ocio',
  autoDebit: false, debitAccountId: null, failedCount: 0,
};

const inactiveRec: RecurringExpense = {
  id: 'r3', name: 'Viejo', amount: 1000, currency: 'ARS', categoryId: 'c1', frequency: 'MONTHLY',
  billingDay: 1, weekday: null, dueMonth: null, installmentsTotal: null, cashPrice: null,
  autoDebit: false, debitAccountId: null, debitPaymentMethodId: null,
  active: false, createdAt: '2026-01-01T00:00:00',
};

function makeData(items: RecurringItem[]): CurrencyExpenses {
  const nonEssential = items.filter((i) => !i.isEssential).reduce((s, i) => s + i.amount * i.expectedCount, 0);
  const committed = items.reduce((s, i) => s + i.amount * i.expectedCount, 0);
  return {
    currency: 'ARS', total: 100000, essentialTotal: 0, nonEssentialTotal: 0, prevMonthTotal: 0,
    avg3mTotal: 0, totalToDate: null, projectedTotal: null, byCategory: [], months: [],
    recurring: {
      committedTotal: committed, paidTotal: 6000, pendingTotal: 56000,
      nonEssentialCommittedTotal: nonEssential, items,
    },
  };
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/recurring-expenses')) return jsonResponse(200, [inactiveRec]);
      return jsonResponse(200, []);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderSection(data: CurrencyExpenses) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}>
        <ToastProvider>
          <RecurringSection data={data} year={2026} month={8} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('RecurringSection', () => {
  it('muestra totales, % recurrente y el leak no esencial', async () => {
    renderSection(makeData([item1, item2]));
    // S29.1: el h2 "Gastos recurrentes" vive en el <Section> colapsable de la página, no acá.
    expect(await screen.findByText('Comprometido')).toBeInTheDocument();
    expect(screen.getByText('Pagado')).toBeInTheDocument();
    // committed = 50000 + 6000*2 = 62000 sobre total 100000 → 62%
    expect(screen.getByText(/62% de tu gasto del mes es recurrente/)).toBeInTheDocument();
    expect(screen.getByText(/es no esencial/)).toBeInTheDocument();
  });

  it('renderiza los items con su estado', async () => {
    renderSection(makeData([item1, item2]));
    expect(await screen.findByText('Alquiler')).toBeInTheDocument();
    expect(screen.getByText('Streaming')).toBeInTheDocument();
    // item1 PENDING, item2 PARTIAL 1/2 (badge de item, no el label del stat "Pendiente")
    expect(screen.getByText('Parcial 1/2')).toBeInTheDocument();
  });

  it('sección Inactivos colapsada que se expande', async () => {
    renderSection(makeData([item1]));
    const toggle = await screen.findByText(/Inactivos \(1\)/);
    expect(screen.queryByText('Viejo')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(await screen.findByText('Viejo')).toBeInTheDocument();
  });

  it('empty state con CTA cuando no hay recurrentes', async () => {
    renderSection(makeData([]));
    expect(await screen.findByText(/Declará tus suscripciones/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeInTheDocument();
  });

  // ── Sprint 24.4: débito automático ──────────────────────────────────────────

  it('item con débito automático: va bajo su grupo y badge Sin saldo si falló', async () => {
    const autoItem: RecurringItem = {
      ...item1, id: 'ra', name: 'Spotify', autoDebit: true, debitAccountId: 'acc1', failedCount: 1,
    };
    renderSection(makeData([autoItem]));
    expect(await screen.findByText('Spotify')).toBeInTheDocument();
    // el "· Auto" en gris se reemplazó por el encabezado del grupo (los dos tipos ya no se mezclan)
    expect(screen.getByText('Débito automático')).toBeInTheDocument();
    expect(screen.getByText('Sin saldo')).toBeInTheDocument();
  });

  it('cartel de cuenta faltante cuando autoDebit sin debitAccountId', async () => {
    const orphan: RecurringItem = {
      ...item1, id: 'ro', name: 'HBO', autoDebit: true, debitAccountId: null, failedCount: 0,
    };
    renderSection(makeData([orphan]));
    expect(await screen.findByText('Configurá la cuenta de débito')).toBeInTheDocument();
  });

  // ── Automáticos vs manuales: grupos, filtro y "Pagué" ───────────────────────

  const autoItem: RecurringItem = {
    ...item1, id: 'ra', name: 'Spotify', autoDebit: true, debitAccountId: 'acc1',
  };

  it('parte la lista en dos grupos cuando hay automáticos y manuales', async () => {
    renderSection(makeData([autoItem, item1]));
    expect(await screen.findByRole('heading', { name: 'Débito automático' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Los pagás vos' })).toBeInTheDocument();
  });

  it('el filtro sólo aparece con los dos tipos, y deja ver uno solo', async () => {
    renderSection(makeData([item1]));
    await screen.findByText('Alquiler');
    expect(screen.queryByRole('tablist', { name: 'Filtrar recurrentes' })).not.toBeInTheDocument();

    cleanup();
    renderSection(makeData([autoItem, item1]));
    expect(await screen.findByRole('tab', { name: 'Automáticos' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Automáticos' }));
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.queryByText('Alquiler')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Manuales' }));
    expect(screen.getByText('Alquiler')).toBeInTheDocument();
    expect(screen.queryByText('Spotify')).not.toBeInTheDocument();
  });

  it('un manual pendiente ofrece "Pagué" y abre el alta del pago; un automático no', async () => {
    const activeRec: RecurringExpense = { ...inactiveRec, id: 'r1', name: 'Alquiler', amount: 50000, active: true };
    const autoRec: RecurringExpense = { ...activeRec, id: 'ra', name: 'Spotify', autoDebit: true };
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/recurring-expenses')) return jsonResponse(200, [activeRec, autoRec]);
        return jsonResponse(200, []);
      }),
    );

    renderSection(makeData([autoItem, item1]));
    // una sola fila ofrece el botón: la manual
    const buttons = await screen.findAllByRole('button', { name: 'Pagué' });
    expect(buttons).toHaveLength(1);

    fireEvent.click(buttons[0]);
    expect(await screen.findByText('Marcar pagado: Alquiler')).toBeInTheDocument();
  });

  it('no ofrece "Pagué" en un manual ya pagado', async () => {
    const activeRec: RecurringExpense = { ...inactiveRec, id: 'r1', name: 'Alquiler', active: true };
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/recurring-expenses')) return jsonResponse(200, [activeRec]);
        return jsonResponse(200, []);
      }),
    );

    renderSection(makeData([{ ...item1, state: 'PAID', paidCount: 1 }]));
    await screen.findByText('Alquiler');
    expect(screen.queryByRole('button', { name: 'Pagué' })).not.toBeInTheDocument();
  });
});
