import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { GroupExpenseDetailModal } from './GroupExpenseDetailModal';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ok } from '../../test/mockResponse';
import type { GroupComment, GroupExpense } from './api';

type Call = { url: string; method: string; body?: string };

const EXPENSE: GroupExpense = {
  id: 'e1',
  amount: 1000,
  currency: 'ARS',
  date: '2026-09-06',
  description: 'Super',
  categoryHint: null,
  splitType: 'EQUAL',
  createdByName: 'Ana',
  payers: [{ memberId: 'm-ana', displayName: 'Ana', amount: 1000 }],
  splits: [
    { memberId: 'm-ana', displayName: 'Ana', amount: 500 },
    { memberId: 'm-beto', displayName: 'Beto', amount: 500 },
  ],
  yourShare: 500,
  yourPaid: 1000,
  membersWithoutAccount: [],
};

function comment(mine: boolean): GroupComment {
  return {
    id: 'c1',
    memberId: mine ? 'm-ana' : 'm-beto',
    authorName: mine ? 'Ana' : 'Beto',
    body: 'Faltó la propina',
    createdAt: '2026-09-06T10:00:00',
    mine,
  };
}

function stubFetch(comments: GroupComment[]) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.includes('/comments') && method === 'POST') return ok(comment(true));
      if (url.includes('/comments') && method === 'DELETE') return ok({});
      if (url.includes('/comments')) return ok(comments);
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
          <GroupExpenseDetailModal groupId="g1" expense={EXPENSE} onClose={() => {}} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GroupExpenseDetailModal (S47)', () => {
  it('muestra cómo quedó repartido, que es de lo que se discute', async () => {
    stubFetch([]);
    renderModal();

    await screen.findByText('Quién puso');
    expect(screen.getByText('A quién le toca')).toBeInTheDocument();
    // Ana aparece de los dos lados: puso 1000 y le toca 500.
    expect(screen.getAllByText('Ana').length).toBeGreaterThanOrEqual(2);
  });

  it('sin comentarios lo dice', async () => {
    stubFetch([]);
    renderModal();

    await screen.findByText('Todavía nadie dijo nada.');
  });

  it('el borrar aparece sólo en los propios', async () => {
    stubFetch([comment(false)]);
    renderModal();

    await screen.findByText(/Faltó la propina/);
    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument();
  });

  it('comentar manda el texto y limpia el campo', async () => {
    const calls = stubFetch([]);
    renderModal();

    fireEvent.change(await screen.findByLabelText('Escribir un comentario'), {
      target: { value: '  Esto lo pagamos entre tres  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Comentar' }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST');
      expect(post).toBeDefined();
      expect(JSON.parse(post!.body!)).toEqual({ body: 'Esto lo pagamos entre tres' });
    });

    await waitFor(() => {
      expect((screen.getByLabelText('Escribir un comentario') as HTMLInputElement).value).toBe('');
    });
  });

  it('un comentario vacío no se puede mandar', async () => {
    stubFetch([]);
    renderModal();

    expect(await screen.findByRole('button', { name: 'Comentar' })).toBeDisabled();
  });
});
