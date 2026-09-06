import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { GroupExpenseModal } from './GroupExpenseModal';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ok } from '../../test/mockResponse';
import { selectOption } from '../../test/selectOption';
import type { GroupMember } from './api';

type Call = { url: string; method: string; body?: string };

const ANA: GroupMember = {
  id: 'm-ana', displayName: 'Ana', claimed: true, owner: true, me: true, left: false,
};
const BETO: GroupMember = {
  id: 'm-beto', displayName: 'Beto', claimed: true, owner: false, me: false, left: false,
};

function stubFetch() {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.includes('/expenses') && method === 'POST') {
        return ok({ id: 'e1', membersWithoutAccount: [] });
      }
      if (url.includes('/categories')) return ok([]);
      return ok({});
    }),
  );
  return calls;
}

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <GroupExpenseModal
            open
            onClose={() => {}}
            groupId="g1"
            currency="ARS"
            members={[ANA, BETO]}
            myMemberId="m-ana"
          />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function bodyOfPost(calls: Call[]) {
  const post = calls.find((c) => c.method === 'POST' && c.url.includes('/expenses'));
  expect(post).toBeDefined();
  return JSON.parse(post!.body!);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GroupExpenseModal (S47)', () => {
  it('arranca con todos participando, que es el caso común', async () => {
    stubFetch();
    renderModal();

    expect(await screen.findByLabelText('Ana')).toBeChecked();
    expect(screen.getByLabelText('Beto')).toBeChecked();
  });

  it('el equitativo manda a los participantes y un solo pagador', async () => {
    const calls = stubFetch();
    renderModal();

    fireEvent.change(await screen.findByLabelText(/Monto/), { target: { value: '3000' } });
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Cena' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar gasto' }));

    await waitFor(() => {
      const body = bodyOfPost(calls);
      expect(body.splitType).toBe('EQUAL');
      expect(body.amount).toBe(3000);
      expect(body.payers).toEqual([{ memberId: 'm-ana', amount: 3000 }]);
      expect(body.participants).toHaveLength(2);
    });
  });

  it('destildar a alguien lo saca del gasto: un gasto es de los que participan', async () => {
    const calls = stubFetch();
    renderModal();

    fireEvent.change(await screen.findByLabelText(/Monto/), { target: { value: '3000' } });
    fireEvent.click(screen.getByLabelText('Beto'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar gasto' }));

    await waitFor(() => {
      const body = bodyOfPost(calls);
      expect(body.participants).toEqual([{ memberId: 'm-ana' }]);
    });
  });

  it('con montos exactos que no cierran lo dice en vivo y no deja guardar', async () => {
    stubFetch();
    renderModal();

    fireEvent.change(await screen.findByLabelText(/Monto/), { target: { value: '1000' } });
    await selectOption(/Cómo se reparte/, 'EXACT');

    // Los dos campos "Le toca" quedan vacíos: suman 0 y el gasto es 1000.
    await screen.findByText(/Los montos suman/);
    expect(screen.getByRole('button', { name: 'Guardar gasto' })).toBeDisabled();
  });

  it('con porcentajes que no suman 100 tampoco deja guardar', async () => {
    stubFetch();
    renderModal();

    fireEvent.change(await screen.findByLabelText(/Monto/), { target: { value: '1000' } });
    await selectOption(/Cómo se reparte/, 'PERCENT');

    const percentInputs = screen.getAllByLabelText('%');
    fireEvent.change(percentInputs[0], { target: { value: '50' } });
    fireEvent.change(percentInputs[1], { target: { value: '40' } });

    await screen.findByText(/tienen que sumar 100/);
    expect(screen.getByRole('button', { name: 'Guardar gasto' })).toBeDisabled();
  });

  it('cuando pagaron varios, avisa si lo que pusieron no da el total', async () => {
    stubFetch();
    renderModal();

    fireEvent.change(await screen.findByLabelText(/Monto/), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pagaron entre varios' }));

    await screen.findByText('Cuánto puso cada uno.');
    await screen.findByText(/Entre todos pusieron/);
    expect(screen.getByRole('button', { name: 'Guardar gasto' })).toBeDisabled();
  });
});
