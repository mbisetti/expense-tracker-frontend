import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { FriendDebtsBreakdown } from './FriendDebtsBreakdown';
import { jsonResponse } from '../../test/mockResponse';
import type { PersonDebts } from '../shared/api';

const debts: PersonDebts = {
  accountId: 'sys-1',
  people: [
    {
      personId: 'p1',
      name: 'Bauti',
      owed: [{ currency: 'ARS', amount: 25000 }],
      debts: [],
    },
    {
      personId: 'p2',
      name: 'Coty',
      owed: [{ currency: 'ARS', amount: 8000 }],
      debts: [],
    },
  ],
};

function stubFetch(payload: PersonDebts) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/person-debts')) return jsonResponse(200, payload);
      return jsonResponse(200, []);
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

function renderBreakdown() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        <MemoryRouter>
          <FriendDebtsBreakdown />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('FriendDebtsBreakdown (card de "Deudas con amigos")', () => {
  beforeEach(() => stubFetch(debts));

  it('muestra de quién es cada peso: sin esto la card es un número rojo sin explicación', async () => {
    renderBreakdown();

    expect(await screen.findByText('Bauti')).toBeInTheDocument();
    expect(screen.getByText('Coty')).toBeInTheDocument();
    expect(screen.getByText(/25\.000/)).toBeInTheDocument();
    expect(screen.getByText(/8\.000/)).toBeInTheDocument();
  });

  it('NO ofrece acciones genéricas: saldar pasa siempre por Debés', async () => {
    renderBreakdown();
    await screen.findByText('Bauti');

    // Un pago genérico a esta cuenta bajaría el saldo sin cerrar ninguna deuda concreta, y el
    // desglose quedaría diciendo que le seguís debiendo a todo el mundo (§7.5 del spec).
    expect(screen.queryByRole('button', { name: /Registrar pago/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ajustar deuda/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver en Gastos' })).toHaveAttribute(
      'href',
      '/expenses#compartidos',
    );
  });

  it('vacía dice que no debés nada (la cuenta quedó en 0 y es correcto que se vea)', async () => {
    vi.unstubAllGlobals();
    stubFetch({ accountId: 'sys-1', people: [] });
    renderBreakdown();

    expect(await screen.findByText('No le debés nada a nadie.')).toBeInTheDocument();
  });
});
