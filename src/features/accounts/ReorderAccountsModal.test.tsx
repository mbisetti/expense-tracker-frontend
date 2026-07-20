import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ReorderAccountsModal } from './ReorderAccountsModal';
import { ok } from '../../test/mockResponse';
import type { Account } from './api';

function acc(id: string, name: string): Account {
  return {
    id,
    name,
    type: 'CASH',
    currency: 'ARS',
    balance: 0,
    isInformal: false,
    createdAt: '2026-07-01T00:00:00',
    statementCloseDay: null,
    paymentDueDay: null,
    balances: [{ currency: 'ARS', balance: 0 }],
    institution: null,
    linkedAccountId: null,
  };
}

const accounts = [acc('a', 'Alpha'), acc('b', 'Bravo'), acc('c', 'Charlie')];

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ReorderAccountsModal open accounts={accounts} onClose={() => {}} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('ReorderAccountsModal', () => {
  it('lista las cuentas en el orden recibido', () => {
    vi.stubGlobal('fetch', vi.fn(() => ok({})));
    renderModal();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('Alpha')).toBeInTheDocument();
    expect(within(items[1]).getByText('Bravo')).toBeInTheDocument();
    expect(within(items[2]).getByText('Charlie')).toBeInTheDocument();
  });

  it('al soltar el drag hace PUT /accounts/order con el orden completo nuevo', async () => {
    let putBody: { accountIds: string[] } | undefined;
    const fetchMock = vi.fn((_url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') {
        putBody = JSON.parse(options.body as string);
      }
      return ok({});
    });
    vi.stubGlobal('fetch', fetchMock);
    renderModal();

    // jsdom no calcula layout: stubeamos los rects de las filas (40px cada una, apiladas)
    const items = screen.getAllByRole('listitem');
    items.forEach((el, i) => {
      el.getBoundingClientRect = () =>
        ({ top: i * 40, height: 40, bottom: i * 40 + 40, left: 0, right: 0, width: 0, x: 0, y: i * 40, toJSON: () => {} }) as DOMRect;
    });

    // arrastrar "Alpha" (fila 0) hasta la zona de la fila 2 (y=90 → target index 2)
    const handle = screen.getByRole('button', { name: 'Mover Alpha' });
    fireEvent.pointerDown(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 90 });
    fireEvent.pointerUp(handle, { pointerId: 1 });

    await waitFor(() => expect(putBody).toBeDefined());
    // Alpha pasó al final: [Bravo, Charlie, Alpha]
    expect(putBody?.accountIds).toEqual(['b', 'c', 'a']);

    // y la UI refleja el nuevo orden
    const reordered = screen.getAllByRole('listitem');
    expect(within(reordered[0]).getByText('Bravo')).toBeInTheDocument();
    expect(within(reordered[2]).getByText('Alpha')).toBeInTheDocument();
  });
});
