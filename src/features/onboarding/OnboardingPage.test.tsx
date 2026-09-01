import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { OnboardingPage } from './OnboardingPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse, ok } from '../../test/mockResponse';
import { selectValue } from '../../test/selectOption';
import type { Account, AccountType } from '../accounts/api';

function account(id: string, name: string, type: AccountType = 'BANK'): Account {
  return {
    id,
    name,
    type,
    currency: 'ARS',
    balance: 0,
    isInformal: false,
    createdAt: '2026-09-01T10:00:00Z',
    statementCloseDay: null,
    paymentDueDay: null,
    balances: [{ currency: 'ARS', balance: 0 }],
    institution: null,
    linkedAccountId: null,
  };
}

const ME = {
  id: 'u1',
  email: 'nuevo@test.com',
  name: 'Nuevo',
  defaultCurrency: 'ARS',
  workingCurrencies: [],
  hasPassword: true,
  googleLinked: false,
  emailVerified: true,
  onboarded: false,
  createdAt: '2026-09-01T10:00:00Z',
};

type Call = { url: string; method: string; body?: string };

function stubFetch(accounts: Account[]) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? init.body : undefined,
      });
      if (url.includes('/users/me/onboarding')) return jsonResponse(204);
      if (url.includes('/users/me')) return ok(ME);
      if (url.includes('/categories')) return ok([]);
      if (/\/accounts\/[^/]+\/value$/.test(url)) return jsonResponse(204);
      if (url.includes('/accounts')) return ok(accounts);
      return ok({});
    }),
  );
  return calls;
}

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/dashboard', element: <h1>Dashboard</h1> },
      { path: '/datos', element: <h1>Datos</h1> },
      { path: '/telegram', element: <h1>Bot</h1> },
    ],
    { initialEntries: ['/onboarding'] },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

/** Paso 1 -> 2. El "Siguiente" del paso 1 guarda la moneda antes de avanzar. */
async function goToAccounts() {
  fireEvent.click(await screen.findByRole('button', { name: 'Siguiente' }));
  await screen.findByRole('heading', { name: 'Tus cuentas' });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OnboardingPage (S46)', () => {
  it('el paso 1 guarda la moneda principal y recién ahí avanza', async () => {
    const calls = stubFetch([account('a1', 'Santander')]);
    renderPage();

    await screen.findByRole('heading', { name: 'Bienvenido a Maat' });
    // Default ARS aunque el alta haya dejado USD (D6). El Select es el listbox custom del
    // design system, no un <select> nativo: el valor vive en data-value del trigger.
    expect(selectValue(/Moneda principal/)).toBe('ARS');

    await goToAccounts();

    const patch = calls.find((c) => c.method === 'PATCH');
    expect(patch?.url).toContain('/users/me');
    expect(JSON.parse(patch!.body!)).toEqual({ defaultCurrency: 'ARS' });
  });

  it('sin cuentas no se puede seguir, pero sí saltar (D4)', async () => {
    stubFetch([]);
    renderPage();

    await goToAccounts();

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(
      screen.getByText(/Agregá al menos una cuenta para seguir/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saltar por ahora' })).toBeEnabled();
  });

  it('con una cuenta cargada el paso 2 deja seguir', async () => {
    stubFetch([account('a1', 'Santander')]);
    renderPage();

    await goToAccounts();

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
  });

  // El paso 3 es una fila por cuenta: cada "Guardar" es su propio PUT contra esa cuenta.
  it('el paso 3 manda el saldo de cada cuenta a su propio endpoint', async () => {
    const calls = stubFetch([account('a1', 'Santander'), account('a2', 'Efectivo', 'CASH')]);
    renderPage();

    await goToAccounts();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByRole('heading', { name: '¿Cuánto tenés hoy?' });

    fireEvent.change(screen.getByLabelText(/Santander/), { target: { value: '500000' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[0]);

    expect(await screen.findByText('Guardado')).toBeInTheDocument();
    const put = calls.find((c) => c.method === 'PUT');
    expect(put?.url).toContain('/accounts/a1/value');
    expect(JSON.parse(put!.body!)).toEqual({ currency: 'ARS', currentValue: 500000 });
  });

  // La tarjeta no se ajusta (su saldo es el resumen del ciclo) y la deuda tampoco se carga acá.
  it('el paso 3 no ofrece la tarjeta de crédito', async () => {
    stubFetch([account('a1', 'Santander'), account('a2', 'Visa', 'CREDIT')]);
    renderPage();

    await goToAccounts();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByRole('heading', { name: '¿Cuánto tenés hoy?' });

    expect(screen.getByLabelText(/Santander/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Visa/)).not.toBeInTheDocument();
  });

  it('saltar marca la guía como vista y va al dashboard', async () => {
    const calls = stubFetch([]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Saltar por ahora' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(
      calls.some((c) => c.method === 'POST' && c.url.includes('/users/me/onboarding')),
    ).toBe(true);
  });

  it('terminar la guía la marca igual que saltarla', async () => {
    const calls = stubFetch([account('a1', 'Santander')]);
    renderPage();

    await goToAccounts();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByRole('heading', { name: '¿Cuánto tenés hoy?' });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByRole('heading', { name: 'Tu primer movimiento' });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByRole('heading', { name: 'Anotá sin abrir la app' });

    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(
      calls.some((c) => c.method === 'POST' && c.url.includes('/users/me/onboarding')),
    ).toBe(true);
  });

  // Irse a importar es una salida legítima del wizard, no un abandono: se marca igual (D8).
  it('ir a importar sale del wizard marcándolo completo', async () => {
    const calls = stubFetch([account('a1', 'Santander')]);
    renderPage();

    await goToAccounts();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByRole('heading', { name: '¿Cuánto tenés hoy?' });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByRole('heading', { name: 'Tu primer movimiento' });

    fireEvent.click(screen.getByRole('button', { name: 'Ir a importar' }));

    expect(await screen.findByRole('heading', { name: 'Datos' })).toBeInTheDocument();
    expect(
      calls.some((c) => c.method === 'POST' && c.url.includes('/users/me/onboarding')),
    ).toBe(true);
  });
});
