import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { AccountCardBody } from './AccountCardBody';
import { jsonResponse } from '../../test/mockResponse';
import type { Account } from './api';

const base: Account = {
  id: 'a1',
  name: 'Caja de ahorro',
  type: 'BANK',
  currency: 'ARS',
  balance: 200000,
  isInformal: false,
  createdAt: '2026-01-01T00:00:00',
  statementCloseDay: null,
  paymentDueDay: null,
  balances: [],
  institution: null,
  linkedAccountId: null,
};

const tx = {
  id: 't1',
  accountId: 'a1',
  type: 'EXPENSE',
  amount: 1000,
  currency: 'ARS',
  date: '2026-08-02',
  description: 'Kiosco',
};

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/transactions')) {
        return jsonResponse(200, { content: [tx], page: 0, size: 100, totalElements: 1, totalPages: 1 });
      }
      return jsonResponse(200, {});
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

function renderCard(account: Account) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        <MemoryRouter>
          <AccountCardBody
            account={account}
            allAccounts={[account]}
            paymentMethods={[]}
            onEdit={() => {}}
            onAddCard={() => {}}
          />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('Links de la card de cuenta (S42)', () => {
  it('"Ver todos" abre Transacciones filtrado por esta cuenta', async () => {
    stubFetch();
    renderCard(base);

    const link = await screen.findByRole('link', { name: 'Ver todos' });
    expect(link).toHaveAttribute('href', '/transactions?accountId=a1');
  });

  it('el link al home banking muestra el HOST y abre en otra pestaña', async () => {
    stubFetch();
    renderCard({ ...base, externalUrl: 'https://onlinebanking.bancogalicia.com.ar/dashboard' });

    const link = await screen.findByRole('link', { name: /onlinebanking\.bancogalicia\.com\.ar/ });
    expect(link).toHaveAttribute('href', 'https://onlinebanking.bancogalicia.com.ar/dashboard');
    expect(link).toHaveAttribute('target', '_blank');
    // noreferrer además de noopener: sin esto la página del banco recibe window.opener.
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('sin link cargado no aparece nada', async () => {
    stubFetch();
    renderCard(base);

    await screen.findByRole('link', { name: 'Ver todos' });
    expect(screen.queryByRole('link', { name: /bancogalicia/ })).not.toBeInTheDocument();
  });

  it('el "www." se saca del host: no aporta nada y ocupa lugar', async () => {
    stubFetch();
    renderCard({ ...base, externalUrl: 'https://www.santander.com.ar' });

    expect(await screen.findByRole('link', { name: /^santander\.com\.ar/ })).toBeInTheDocument();
  });
});
