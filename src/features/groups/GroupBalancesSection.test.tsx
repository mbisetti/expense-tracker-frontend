import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { GroupBalancesSection } from './GroupBalancesSection';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ok } from '../../test/mockResponse';
import type { GroupBalances, PairBalance } from './api';

type Call = { url: string; method: string; body?: string };

function pair(from: string, to: string, amount: number): PairBalance {
  return {
    fromMemberId: `m-${from}`,
    fromName: from,
    toMemberId: `m-${to}`,
    toName: to,
    amount,
    currency: 'ARS',
  };
}

function stubFetch(balances: GroupBalances) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.includes('/settlements')) return ok({ id: 's1', membersWithoutAccount: [] });
      if (url.includes('/balances')) return ok(balances);
      return ok({});
    }),
  );
  return calls;
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <GroupBalancesSection groupId="g1" />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GroupBalancesSection (S47)', () => {
  it('sin deudas lo dice, no deja la card vacía', async () => {
    stubFetch({ pairwise: [], simplified: [], simplifyEnabled: true });
    renderSection();

    await screen.findByText('Están todos a mano.');
  });

  it('dice quién le debe a quién, no sólo un número', async () => {
    stubFetch({
      pairwise: [pair('Beto', 'Ana', 500), pair('Carla', 'Ana', 500)],
      simplified: [pair('Beto', 'Ana', 500), pair('Carla', 'Ana', 500)],
      simplifyEnabled: true,
    });
    renderSection();

    await screen.findByText('Beto le debe a Ana');
    expect(screen.getByText('Carla le debe a Ana')).toBeInTheDocument();
  });

  it('la sugerencia aparece SOLO si de verdad ahorra pagos', async () => {
    // Dos pagos de a pares y dos simplificados: no hay nada que sugerir.
    stubFetch({
      pairwise: [pair('Beto', 'Ana', 500), pair('Carla', 'Ana', 500)],
      simplified: [pair('Beto', 'Ana', 500), pair('Carla', 'Ana', 500)],
      simplifyEnabled: true,
    });
    renderSection();

    await screen.findByText('Beto le debe a Ana');
    expect(screen.queryByText(/quedan todos en cero/)).not.toBeInTheDocument();
  });

  it('cuando ahorra pagos, lo muestra con el número concreto', async () => {
    stubFetch({
      pairwise: [pair('Beto', 'Ana', 500), pair('Carla', 'Beto', 500)],
      simplified: [pair('Carla', 'Ana', 500)],
      simplifyEnabled: true,
    });
    renderSection();

    await screen.findByText(/Con 1 pago en vez de 2 quedan todos en cero/);
    expect(screen.getByText('Carla le paga $ 500,00 a Ana')).toBeInTheDocument();
  });

  it('apagada la simplificación, no se sugiere nada', async () => {
    stubFetch({
      pairwise: [pair('Beto', 'Ana', 500), pair('Carla', 'Beto', 500)],
      simplified: [pair('Carla', 'Ana', 500)],
      simplifyEnabled: false,
    });
    renderSection();

    await screen.findByText('Beto le debe a Ana');
    expect(screen.queryByText(/quedan todos en cero/)).not.toBeInTheDocument();
  });

  it('anotar el pago se pre-confirma y manda el saldo entero', async () => {
    const calls = stubFetch({
      pairwise: [pair('Beto', 'Ana', 500)],
      simplified: [pair('Beto', 'Ana', 500)],
      simplifyEnabled: true,
    });
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: 'Saldar' }));

    // Todo flujo que toca plata se pre-confirma, y el diálogo dice dónde cae.
    await screen.findByText(/Beto le pagó .* a Ana/);
    expect(screen.getByText(/la cuenta que cada uno eligió para el grupo/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Anotar' }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url.includes('/settlements'));
      expect(post).toBeDefined();
      expect(JSON.parse(post!.body!)).toEqual({
        fromMemberId: 'm-Beto',
        toMemberId: 'm-Ana',
        amount: 500,
        currency: 'ARS',
      });
    });
  });
});
