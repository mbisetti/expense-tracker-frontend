import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { ExpensesPage } from './ExpensesPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';
import type { CurrencyExpenses } from './api';

function months(nonEssential: number): CurrencyExpenses['months'] {
  return ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'].map((m, i) => ({
    month: m,
    essential: 0,
    nonEssential: i === 5 ? nonEssential : 0,
  }));
}

const arsCurrency: CurrencyExpenses = {
  currency: 'ARS',
  total: 900,
  essentialTotal: 300,
  nonEssentialTotal: 600,
  prevMonthTotal: 600,
  avg3mTotal: 500,
  totalToDate: null,
  projectedTotal: null,
  byCategory: [
    { categoryId: 'c1', name: 'Ocio', color: '#ff0000', isEssential: false, amount: 500, prevMonthAmount: 400, avg3mAmount: 300, txCount: 3, avg3mCount: 3, maxTxAmount: 200 },
    { categoryId: 'c2', name: 'Vivienda', color: '#00ff00', isEssential: true, amount: 300, prevMonthAmount: 300, avg3mAmount: 300, txCount: 1, avg3mCount: 1, maxTxAmount: 300 },
    { categoryId: null, name: null, color: null, isEssential: false, amount: 100, prevMonthAmount: 0, avg3mAmount: 0, txCount: 2, avg3mCount: 0, maxTxAmount: 60 },
  ],
  months: months(600),
};

const usdCurrency: CurrencyExpenses = {
  currency: 'USD',
  total: 40,
  essentialTotal: 0,
  nonEssentialTotal: 40,
  prevMonthTotal: 0,
  avg3mTotal: 0,
  totalToDate: null,
  projectedTotal: null,
  byCategory: [
    { categoryId: 'c3', name: 'Viajes', color: '#0000ff', isEssential: false, amount: 40, prevMonthAmount: 0, avg3mAmount: 0, txCount: 1, avg3mCount: 0, maxTxAmount: 40 },
  ],
  months: months(40),
};

let byCurrency: CurrencyExpenses[];

beforeEach(() => {
  byCurrency = [arsCurrency];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/summary/expenses')) {
        // S49: ipcAsOf viaja siempre (dice si el switch se puede prender); constant es lo que
        // efectivamente se hizo.
        return jsonResponse(200, {
          year: 2026,
          month: 7,
          constant: url.includes('constant=true'),
          ipcAsOf: '2026-07',
          unadjustedMonths: 0,
          byCurrency,
        });
      }
      if (url.includes('/users/me')) {
        return jsonResponse(200, { id: 'u', email: 'a@a.com', name: 'A', defaultCurrency: 'ARS' });
      }
      if (url.includes('/categories')) return jsonResponse(200, []);
      return jsonResponse(200, []);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  // S29.1: el abierto/colapsado persiste en localStorage y el hash abre secciones — sin esto
  // un test contamina al siguiente.
  localStorage.clear();
  window.location.hash = '';
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <MemoryRouter>
            <ExpensesPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ExpensesPage', () => {
  it('renderiza las secciones con una moneda', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Gastos' })).toBeInTheDocument();
    // desglose + insights (Ocio y "Sin categoría" aparecen en ambos → getAllByText)
    expect((await screen.findAllByText('Ocio')).length).toBeGreaterThan(0);
    expect(screen.getByText('Vivienda')).toBeInTheDocument(); // esencial → solo en el desglose
    expect(screen.getAllByText('Sin categoría').length).toBeGreaterThan(0);
    // insights: colapsada por default (S29.1) — el heading está, el body recién al abrir
    expect(screen.getByRole('heading', { name: 'Dónde recortar' })).toBeInTheDocument();
    expect(screen.queryByText(/Recortando 20% de lo no esencial/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dónde recortar' }));
    expect(await screen.findByText(/Recortando 20% de lo no esencial/)).toBeInTheDocument();
  });

  it('S29.1: los chips saltan a la sección y la abren', async () => {
    renderPage();

    const nav = await screen.findByRole('navigation', { name: 'Ir a sección' });
    fireEvent.click(within(nav).getByRole('button', { name: 'Recortar' }));
    expect(await screen.findByText(/Recortando 20% de lo no esencial/)).toBeInTheDocument();
  });

  it('Compartidos siempre tiene chip; sin deudas abre un empty state con CTA', async () => {
    renderPage();

    const nav = await screen.findByRole('navigation', { name: 'Ir a sección' });
    fireEvent.click(within(nav).getByRole('button', { name: 'Compartidos' }));

    expect(await screen.findByText('Nadie te debe nada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Repartir un gasto' })).toBeInTheDocument();
  });

  it('S29.1: el abierto/colapsado persiste entre visitas (localStorage)', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Dónde recortar' }));
    await screen.findByText(/Recortando 20% de lo no esencial/);

    cleanup();
    renderPage();
    expect(await screen.findByText(/Recortando 20% de lo no esencial/)).toBeInTheDocument();
  });

  it('S29.1: el hash de la URL abre la sección al cargar', async () => {
    window.location.hash = '#recortar';
    renderPage();
    expect(await screen.findByText(/Recortando 20% de lo no esencial/)).toBeInTheDocument();
  });

  it('muestra la card de Gastos recurrentes', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Gastos recurrentes' })).toBeInTheDocument();
  });

  it('EmptyState cuando no hay gastos en el período', async () => {
    byCurrency = [];
    renderPage();
    expect(await screen.findByText('No hay gastos en este período.')).toBeInTheDocument();
  });

  it('con dos monedas muestra los tabs y cambia el análisis al elegir otra', async () => {
    byCurrency = [arsCurrency, usdCurrency];
    renderPage();

    // default = defaultCurrency ARS → muestra Ocio; USD todavía no
    expect((await screen.findAllByText('Ocio')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Viajes')).not.toBeInTheDocument();

    // click en el tab USD → muestra la categoría USD y desaparece la ARS
    fireEvent.click(screen.getByRole('tab', { name: 'USD' }));
    expect((await screen.findAllByText('Viajes')).length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Ocio')).toHaveLength(0);
  });
});

// El deep-link por hash tiene que funcionar también con Gastos YA abierta: el tap en una alerta
// de compartidos o recurrentes no remonta la página, y engancharse sólo al montaje lo dejaba sin
// efecto (misma familia de bug que el ?edit= de Transacciones).
function DeepLinkTrigger({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      simular notificación
    </button>
  );
}

function renderPageStandingOnExpenses() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <MemoryRouter initialEntries={['/expenses']}>
            <DeepLinkTrigger to="/expenses#recortar" />
            <ExpensesPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ExpensesPage — deep-link por hash con la página ya abierta', () => {
  it('abre la sección del hash sin remontar la página', async () => {
    renderPageStandingOnExpenses();
    // Arranca colapsada, como en la app.
    expect(await screen.findByRole('heading', { name: 'Dónde recortar' })).toBeInTheDocument();
    expect(screen.queryByText(/Recortando 20% de lo no esencial/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'simular notificación' }));

    expect(await screen.findByText(/Recortando 20% de lo no esencial/)).toBeInTheDocument();
  });

  it('el segundo tap sobre la misma alerta vuelve a abrirla', async () => {
    renderPageStandingOnExpenses();
    await screen.findByRole('heading', { name: 'Dónde recortar' });

    fireEvent.click(screen.getByRole('button', { name: 'simular notificación' }));
    expect(await screen.findByText(/Recortando 20% de lo no esencial/)).toBeInTheDocument();

    // El usuario la colapsa a mano y vuelve a tocar la MISMA notificación (misma URL).
    fireEvent.click(screen.getByRole('button', { name: 'Dónde recortar' }));
    expect(screen.queryByText(/Recortando 20% de lo no esencial/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'simular notificación' }));

    expect(await screen.findByText(/Recortando 20% de lo no esencial/)).toBeInTheDocument();
  });
});

// S49 (D5/D12) — el mismo switch que el Dashboard, al lado de las pestañas de moneda, porque el
// parámetro ajusta la página entera.
describe('ExpensesPage: ajustar por inflación (S49)', () => {
  it('prenderlo pide la página ajustada y lo dice en el resumen del mes', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        urls.push(url);
        if (url.includes('/summary/expenses')) {
          return jsonResponse(200, {
            year: 2026,
            month: 7,
            constant: url.includes('constant=true'),
            ipcAsOf: '2026-07',
            unadjustedMonths: 0,
            byCurrency: [arsCurrency],
          });
        }
        if (url.includes('/users/me')) {
          return jsonResponse(200, { id: 'u', email: 'a@a.com', name: 'A', defaultCurrency: 'ARS' });
        }
        return jsonResponse(200, []);
      }),
    );
    renderPage();

    const toggle = await screen.findByRole('switch', { name: 'Ajustar por inflación' });
    expect(toggle).toBeEnabled();
    expect(screen.queryByText(/En pesos de julio 2026/)).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(
      await screen.findByText('En pesos de julio 2026, según el IPC del INDEC.'),
    ).toBeInTheDocument();
    expect(urls.some((u) => u.includes('constant=true'))).toBe(true);
    expect(localStorage.getItem('inflationAdjusted')).toBe('1');
  });

  // D7: un mes anterior al arranque de la serie queda nominal, y la pantalla lo dice en vez de
  // dejar creer que todo está en la misma base.
  it('avisa cuántos meses quedaron sin ajustar', async () => {
    localStorage.setItem('inflationAdjusted', '1');
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/summary/expenses')) {
          return jsonResponse(200, {
            year: 2026,
            month: 7,
            constant: true,
            ipcAsOf: '2026-07',
            unadjustedMonths: 2,
            byCurrency: [arsCurrency],
          });
        }
        if (url.includes('/users/me')) {
          return jsonResponse(200, { id: 'u', email: 'a@a.com', name: 'A', defaultCurrency: 'ARS' });
        }
        return jsonResponse(200, []);
      }),
    );
    renderPage();

    expect(
      await screen.findByText(
        'En pesos de julio 2026, según el IPC del INDEC. 2 meses quedaron sin ajustar: no hay IPC tan atrás.',
      ),
    ).toBeInTheDocument();
  });

  it('con la pestaña USD activa el switch desaparece', async () => {
    byCurrency = [arsCurrency, usdCurrency];
    renderPage();

    expect(
      await screen.findByRole('switch', { name: 'Ajustar por inflación' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'USD' }));

    expect(screen.queryByRole('switch', { name: 'Ajustar por inflación' })).not.toBeInTheDocument();
  });

  it('sin IPC el switch queda deshabilitado y lo dice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/summary/expenses')) {
          return jsonResponse(200, {
            year: 2026,
            month: 7,
            constant: false,
            ipcAsOf: null,
            unadjustedMonths: 0,
            byCurrency: [arsCurrency],
          });
        }
        if (url.includes('/users/me')) {
          return jsonResponse(200, { id: 'u', email: 'a@a.com', name: 'A', defaultCurrency: 'ARS' });
        }
        return jsonResponse(200, []);
      }),
    );
    renderPage();

    const toggle = await screen.findByRole('switch', { name: 'Ajustar por inflación' });
    expect(toggle).toBeDisabled();
    expect(screen.getByText('Todavía no hay datos del IPC.')).toBeInTheDocument();
  });
});
