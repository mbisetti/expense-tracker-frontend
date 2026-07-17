import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { BudgetSection } from './BudgetSection';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse, ok } from '../../test/mockResponse';

const fail = () => jsonResponse(500, { error: 'INTERNAL', message: 'boom' });

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <BudgetSection />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('BudgetSection', () => {
  it('crear presupuesto abre el form, manda POST con los datos y refresca la lista', async () => {
    let created = false;
    let postBody: Record<string, unknown> | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          created = true;
          postBody = JSON.parse(options.body as string);
          return jsonResponse(201, {
            id: 'b-new',
            categoryId: 'c1',
            limitAmount: 50000,
            currency: 'ARS',
            month: 7,
            year: 2026,
          });
        }
        if (url.includes('/summary/budgets'))
          return ok({
            budgets: created
              ? [
                  {
                    budgetId: 'b-new',
                    categoryId: 'c1',
                    categoryName: 'Comida',
                    currency: 'ARS',
                    limitAmount: 50000,
                    spentAmount: 0,
                    projectedEndOfMonth: 0,
                    projectedStatus: 'ok',
                  },
                ]
              : [],
          });
        if (url.includes('/categories'))
          return ok([
            {
              id: 'c1',
              userId: 'u1',
              name: 'Comida',
              type: 'EXPENSE',
              color: null,
              icon: null,
              sourceDefaultCategoryId: null,
              createdAt: '2026-07-01T00:00:00',
            },
          ]);
        if (url.includes('/accounts'))
          return ok([
            {
              id: 'a1',
              name: 'Efectivo',
              type: 'CASH',
              currency: 'ARS',
              balance: 0,
              isInformal: false,
              createdAt: '2026-07-01T00:00:00',
              statementCloseDay: null,
              paymentDueDay: null,
            },
          ]);
        return ok([]);
      }),
    );

    renderSection();
    // arranca vacío: el CTA es el del centro (EmptyState), no el de arriba a la derecha
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo presupuesto' }));
    // las opciones de categoría/moneda cargan async: esperar antes de elegir
    await screen.findByRole('option', { name: 'Comida' });
    await screen.findByRole('option', { name: 'ARS' });
    fireEvent.change(screen.getByLabelText('Categoría', { exact: false }), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText('Moneda', { exact: false }), { target: { value: 'ARS' } });
    fireEvent.change(screen.getByLabelText('Límite mensual', { exact: false }), {
      target: { value: '50000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(postBody).toMatchObject({ categoryId: 'c1', limitAmount: 50000, currency: 'ARS' }),
    );
  });

  it('muestra los estados ok, warning y exceeded según el gasto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok({
          budgets: [
            {
              budgetId: 'b1',
              categoryId: 'c1',
              categoryName: 'Comida',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 45000,
              projectedEndOfMonth: 45000,
              projectedStatus: 'ok',
            },
            {
              budgetId: 'b2',
              categoryId: 'c2',
              categoryName: 'Transporte',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 85000,
              projectedEndOfMonth: 85000,
              projectedStatus: 'ok',
            },
            {
              budgetId: 'b3',
              categoryId: 'c3',
              categoryName: 'Entretenimiento',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 120000,
              projectedEndOfMonth: 120000,
              projectedStatus: 'will_exceed',
            },
          ],
        }),
      ),
    );

    renderSection();

    expect(await screen.findByText('En presupuesto')).toBeInTheDocument();
    expect(screen.getByText('Cerca del límite')).toBeInTheDocument();
    expect(screen.getByText('Excedido')).toBeInTheDocument();

    const bars = screen.getAllByRole('progressbar');
    // valuenow clampeado a 100 (ARIA); el % real viaja en valuetext
    expect(bars.map((bar) => bar.getAttribute('aria-valuenow'))).toEqual(['45', '85', '100']);
    expect(bars.map((bar) => bar.getAttribute('aria-valuetext'))).toEqual(['45%', '85%', '120%']);
  });

  // Revisión 2026-07-13: 100% exacto ES excedido (te queda $0); warning es [80%, 100%)
  it('80% exacto es warning y 100% exacto es exceeded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok({
          budgets: [
            {
              budgetId: 'b1',
              categoryId: 'c1',
              categoryName: 'Justo 80',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 80000,
              projectedEndOfMonth: 80000,
              projectedStatus: 'ok',
            },
            {
              budgetId: 'b2',
              categoryId: 'c2',
              categoryName: 'Justo 100',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 100000,
              projectedEndOfMonth: 100000,
              projectedStatus: 'ok',
            },
          ],
        }),
      ),
    );

    renderSection();

    expect(await screen.findByText('Cerca del límite')).toBeInTheDocument();
    expect(screen.getByText('Excedido')).toBeInTheDocument();
  });

  it('muestra empty state sin presupuestos', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok({ budgets: [] })));

    renderSection();

    expect(
      await screen.findByText('No definiste presupuestos este mes.'),
    ).toBeInTheDocument();
  });

  it('muestra error si falla el fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(() => fail()));

    renderSection();

    expect(
      await screen.findByText('No pudimos cargar los presupuestos. Intentá de nuevo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('muestra la proyección de fin de mes y ubica el marcador según el límite', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok({
          budgets: [
            {
              budgetId: 'b1',
              categoryId: 'c1',
              categoryName: 'Comida',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 45000,
              projectedEndOfMonth: 90000,
              projectedStatus: 'ok',
            },
          ],
        }),
      ),
    );

    renderSection();

    expect(await screen.findByText(/Proyección fin de mes:/)).toHaveTextContent(
      'Proyección fin de mes: $ 90.000,00',
    );
    const bar = screen.getByRole('progressbar');
    const marker = bar.querySelector('[aria-hidden="true"]');
    expect(marker).toHaveStyle({ left: '90%' });
  });

  // Regla "no alarmar temprano" (revisión 2026-07-14): projectedStatus=will_exceed
  // antes del día 7 se muestra neutro; a partir del día 7, en rojo con aviso.
  it('will_exceed antes del día 7: proyección neutra, sin alarma', async () => {
    vi.setSystemTime(new Date(2026, 6, 3)); // 3 de julio

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok({
          budgets: [
            {
              budgetId: 'b1',
              categoryId: 'c1',
              categoryName: 'Comida',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 20000,
              projectedEndOfMonth: 150000,
              projectedStatus: 'will_exceed',
            },
          ],
        }),
      ),
    );

    renderSection();

    const projection = await screen.findByText(/Proyección fin de mes:/);
    expect(projection).not.toHaveTextContent('va a excederse');
    expect(projection).not.toHaveClass('text-expense');
  });

  it('will_exceed desde el día 7: proyección en alarma', async () => {
    vi.setSystemTime(new Date(2026, 6, 7)); // 7 de julio

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok({
          budgets: [
            {
              budgetId: 'b1',
              categoryId: 'c1',
              categoryName: 'Comida',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 20000,
              projectedEndOfMonth: 150000,
              projectedStatus: 'will_exceed',
            },
          ],
        }),
      ),
    );

    renderSection();

    const projection = await screen.findByText(/Proyección fin de mes:/);
    expect(projection).toHaveTextContent('va a excederse');
    expect(projection).toHaveClass('text-expense');

    // proyección 150% del límite → el marcador se clampea a 100% (no se sale de la barra)
    const marker = screen.getByRole('progressbar').querySelector('[aria-hidden="true"]');
    expect(marker).toHaveStyle({ left: '100%' });
  });
});
