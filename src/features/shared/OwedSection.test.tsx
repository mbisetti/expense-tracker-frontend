import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { openSelect } from '../../test/selectOption';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { OwedSection } from './OwedSection';
import { jsonResponse } from '../../test/mockResponse';
import type { PersonDebts } from './api';

const debts: PersonDebts = {
  accountId: 'sys-1',
  people: [
    {
      personId: 'p1',
      name: 'Bauti',
      owed: [{ currency: 'ARS', amount: 25000 }],
      debts: [
        {
          debtId: 'd1',
          transactionId: 't1',
          date: '2026-08-02',
          description: 'Cena parrilla',
          categoryName: 'Comida',
          amount: 20000,
          currency: 'ARS',
        },
        {
          debtId: 'd2',
          transactionId: 't2',
          date: '2026-08-04',
          description: 'Nafta',
          categoryName: null,
          amount: 5000,
          currency: 'ARS',
        },
      ],
    },
    {
      personId: 'p2',
      name: 'Coty',
      owed: [{ currency: 'USD', amount: 30 }],
      debts: [
        {
          debtId: 'd3',
          transactionId: 't3',
          date: '2026-07-20',
          description: 'Entradas',
          categoryName: 'Salidas',
          amount: 30,
          currency: 'USD',
        },
      ],
    },
  ],
};

const settleCalls: { url: string; body: unknown }[] = [];

function stubFetch(payload: PersonDebts) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/person-debts') && init?.method === 'POST') {
        settleCalls.push({ url, body: JSON.parse(String(init.body)) });
        return jsonResponse(201, payload.people[0]?.debts[0] ?? {});
      }
      if (url.includes('/person-debts')) return jsonResponse(200, payload);
      if (url.includes('/accounts')) {
        return jsonResponse(200, [
          { id: 'a1', name: 'Banco', type: 'BANK', currency: 'ARS', balance: 100000, balances: [] },
          { id: 'a2', name: 'Visa', type: 'CREDIT', currency: 'ARS', balance: 0, balances: [] },
        ]);
      }
      return jsonResponse(200, []);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  settleCalls.length = 0;
});

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <MemoryRouter>
            <OwedSection />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('OwedSection', () => {
  beforeEach(() => stubFetch(debts));

  it('agrupa lo que debés por persona y moneda, sin consolidar', async () => {
    renderSection();

    expect(await screen.findByText('Bauti')).toBeInTheDocument();
    expect(screen.getByText('Coty')).toBeInTheDocument();
    expect(screen.getByText(/25\.000/)).toBeInTheDocument();
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it('despliega las deudas de una persona con su categoría', async () => {
    renderSection();

    const bauti = await screen.findByRole('button', { name: /Bauti/ });
    expect(screen.queryByText('Cena parrilla')).not.toBeInTheDocument();

    fireEvent.click(bauti);

    expect(screen.getByText('Cena parrilla')).toBeInTheDocument();
    // De qué fue el gasto es la mitad de la información: acá sí se categoriza (a diferencia
    // del cobro de S29, que es plata volviendo).
    expect(screen.getByText(/Comida/)).toBeInTheDocument();
    expect(bauti).toHaveAttribute('aria-expanded', 'true');
  });

  it('saldar pide la cuenta de la que sale la plata y NO manda el monto', async () => {
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: /Bauti/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Saldar' })[0]);

    expect(await screen.findByText('Saldar con Bauti')).toBeInTheDocument();

    // Sólo cuentas de activo: a una tarjeta no se le devuelve plata (el server también lo
    // rechaza con NOT_AN_ASSET_ACCOUNT, pero acá directamente no se ofrece).
    const listbox = await openSelect(/¿De qué cuenta salió\?/);
    const values = () =>
      within(listbox)
        .getAllByRole('option')
        .map((el) => el.getAttribute('data-value'));
    await waitFor(() => expect(values()).toContain('a1'));
    expect(values()).not.toContain('a2');

    fireEvent.click(
      within(listbox)
        .getAllByRole('option')
        .find((el) => el.getAttribute('data-value') === 'a1')!,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));

    await waitFor(() => expect(settleCalls).toHaveLength(1));
    expect(settleCalls[0].url).toContain('/person-debts/d1/settle');
    // El monto lo pone el server desde el gasto de la deuda.
    expect(settleCalls[0].body).not.toHaveProperty('amount');
    expect(settleCalls[0].body).toMatchObject({ accountId: 'a1' });
  });

  it('sin deudas dice que no debés nada y deja anotar igual', async () => {
    vi.unstubAllGlobals();
    stubFetch({ accountId: null, people: [] });
    renderSection();

    expect(await screen.findByText('No le debés nada a nadie.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anotar deuda' })).toBeInTheDocument();
  });

  it('el form de anotar avisa que el gasto cuenta el día que pasó', async () => {
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: 'Anotar deuda' }));

    expect(await screen.findByText('Anotar una deuda')).toBeInTheDocument();
    expect(screen.getByText(/Cuenta como gasto tuyo el día que pasó/)).toBeInTheDocument();
    // "Anotá solo tu parte": mezclar esto con el reparto de S29 es otro sprint.
    expect(screen.getByText('Anotá solo tu parte.')).toBeInTheDocument();
  });
});
