import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { JoinGroupPage } from './JoinGroupPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse, ok } from '../../test/mockResponse';
import { selectOption } from '../../test/selectOption';
import type { Account, AccountType } from '../accounts/api';
import type { JoinPreview } from './api';

type Call = { url: string; method: string; body?: string };

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

function preview(overrides: Partial<JoinPreview> = {}): JoinPreview {
  return {
    groupName: 'Depto',
    memberCount: 2,
    expenseCount: 0,
    claimable: [{ id: 'm-beto', displayName: 'Beto' }],
    alreadyMember: false,
    ...overrides,
  };
}

function stubFetch(joinPreview: JoinPreview, previewStatus = 200) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.includes('/groups/join') && method === 'POST') return ok({ groupId: 'g1' });
      if (url.includes('/groups/join')) {
        return previewStatus === 200
          ? ok(joinPreview)
          : jsonResponse(previewStatus, { error: 'INVALID_GROUP_INVITE' });
      }
      if (url.includes('/accounts')) return ok([account('a1', 'Santander')]);
      if (url.includes('/categories')) return ok([]);
      if (url.includes('/payment-methods')) return ok([]);
      return ok({});
    }),
  );
  return calls;
}

function renderPage(search = '?token=tok-123') {
  const router = createMemoryRouter(
    [
      { path: '/grupos/unirse', element: <JoinGroupPage /> },
      { path: '/grupos/:id', element: <h1>Detalle del grupo</h1> },
      { path: '/grupos', element: <h1>Mis grupos</h1> },
    ],
    { initialEntries: [`/grupos/unirse${search}`] },
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('JoinGroupPage (S47)', () => {
  it('muestra a qué grupo estás entrando y qué va a pasar con tu plata antes de entrar', async () => {
    stubFetch(preview());
    renderPage();

    await screen.findByRole('heading', { name: 'Entrar a Depto' });
    expect(screen.getByText('Hay 2 personas en el grupo.')).toBeInTheDocument();
    // El pre-confirm no es adorno: entrar es aceptar que otro te escriba el ledger.
    expect(
      screen.getByText('Los gastos que cargue cualquiera del grupo se van a anotar solos en tu cuenta.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tu cuenta, tu categoría y tu saldo no los ve nadie más.'),
    ).toBeInTheDocument();
  });

  it('sin elegir cuenta no se puede entrar', async () => {
    stubFetch(preview());
    renderPage();

    expect(await screen.findByRole('button', { name: 'Entrar al grupo' })).toBeDisabled();
  });

  it('reclamar una etiqueta manda su claimMemberId y lleva al grupo', async () => {
    const calls = stubFetch(preview());
    renderPage();

    await screen.findByText('¿Alguno de estos sos vos?');
    fireEvent.click(screen.getByLabelText('Beto'));
    await selectOption(/Cuenta/, 'a1');

    fireEvent.click(screen.getByRole('button', { name: 'Entrar al grupo' }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url.includes('/groups/join'));
      expect(post).toBeDefined();
      expect(JSON.parse(post!.body!)).toMatchObject({
        token: 'tok-123',
        claimMemberId: 'm-beto',
        accountId: 'a1',
      });
    });

    await screen.findByRole('heading', { name: 'Detalle del grupo' });
  });

  it('entrar como alguien nuevo manda claimMemberId en null, no lo omite', async () => {
    const calls = stubFetch(preview());
    renderPage();

    await screen.findByText('¿Alguno de estos sos vos?');
    await selectOption(/Cuenta/, 'a1');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar al grupo' }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url.includes('/groups/join'));
      expect(post).toBeDefined();
      expect(JSON.parse(post!.body!).claimMemberId).toBeNull();
    });
  });

  it('si ya estás adentro no te vuelve a pedir nada', async () => {
    stubFetch(preview({ alreadyMember: true }));
    renderPage();

    await screen.findByText('Ya estás en este grupo.');
    expect(screen.queryByRole('button', { name: 'Entrar al grupo' })).not.toBeInTheDocument();
  });

  it('un link vencido o revocado lo dice, y no ofrece entrar', async () => {
    stubFetch(preview(), 400);
    renderPage();

    await screen.findByText('Este link ya no sirve. Pedile uno nuevo a quien te invitó.');
    expect(screen.queryByRole('button', { name: 'Entrar al grupo' })).not.toBeInTheDocument();
  });

  it('un link sin token no rompe: lo dice y no llama al backend', async () => {
    const calls = stubFetch(preview());
    renderPage('');

    await screen.findByText('Este link está incompleto. Pedile uno nuevo a quien te invitó.');
    expect(calls.filter((c) => c.url.includes('/groups/join'))).toHaveLength(0);
  });
});
