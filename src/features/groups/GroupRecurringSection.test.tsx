import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { GroupRecurringSection } from './GroupRecurringSection';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ok } from '../../test/mockResponse';
import { selectOption } from '../../test/selectOption';
import type { GroupMember, GroupRecurring } from './api';

type Call = { url: string; method: string; body?: string };

const ANA: GroupMember = {
  id: 'm-ana', displayName: 'Ana', claimed: true, owner: true, me: true, left: false,
};
const BETO: GroupMember = {
  id: 'm-beto', displayName: 'Beto', claimed: true, owner: false, me: false, left: false,
};

function recurring(): GroupRecurring {
  return {
    id: 'r1',
    name: 'Alquiler',
    amount: 100000,
    currency: 'ARS',
    categoryHint: null,
    payerId: 'm-ana',
    payerName: 'Ana',
    splitType: 'EQUAL',
    frequency: 'MONTHLY',
    billingDay: 5,
    weekday: null,
    dueMonth: null,
    active: true,
    participants: [
      { memberId: 'm-ana', displayName: 'Ana', value: null },
      { memberId: 'm-beto', displayName: 'Beto', value: null },
    ],
  };
}

function stubFetch(items: GroupRecurring[]) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.includes('/recurring') && method !== 'GET') return ok(recurring());
      if (url.includes('/recurring')) return ok(items);
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
          <GroupRecurringSection
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GroupRecurringSection (S47)', () => {
  it('lista con cada cuánto y quién lo pone', async () => {
    stubFetch([recurring()]);
    renderSection();

    await screen.findByText('Alquiler');
    expect(screen.getByText(/Todos los meses · Pone Ana/)).toBeInTheDocument();
  });

  it('el alta manda la frecuencia, el día y los participantes', async () => {
    const calls = stubFetch([]);
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo gasto fijo' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Expensas' } });
    fireEvent.change(screen.getByLabelText(/Monto/), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText(/Qué día del mes/), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST');
      expect(post).toBeDefined();
      expect(JSON.parse(post!.body!)).toMatchObject({
        name: 'Expensas',
        amount: 50000,
        frequency: 'MONTHLY',
        billingDay: 10,
        payerId: 'm-ana',
        participants: [{ memberId: 'm-ana' }, { memberId: 'm-beto' }],
      });
    });
  });

  it('en semanal pregunta el día de la semana, no el del mes', async () => {
    stubFetch([]);
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo gasto fijo' }));
    expect(screen.getByLabelText(/Qué día del mes/)).toBeInTheDocument();

    await selectOption(/Cada cuánto/, 'WEEKLY');

    expect(screen.queryByLabelText(/Qué día del mes/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Qué día')).toBeInTheDocument();
  });

  it('sin nombre o sin monto no se puede guardar', async () => {
    stubFetch([]);
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo gasto fijo' }));
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Expensas' } });
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('apagar la plantilla la conserva: manda active=false, no un borrado', async () => {
    const calls = stubFetch([recurring()]);
    renderSection();

    fireEvent.click(await screen.findByRole('switch', { name: 'Activar Alquiler' }));

    await waitFor(() => {
      const patch = calls.find((c) => c.method === 'PATCH');
      expect(patch).toBeDefined();
      expect(patch!.url).toContain('active=false');
    });
    expect(calls.find((c) => c.method === 'DELETE')).toBeUndefined();
  });

  it('borrar avisa que los gastos ya anotados no se tocan', async () => {
    stubFetch([recurring()]);
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: /Borrar Alquiler/ }));

    await screen.findByText(/Los gastos que ya se anotaron no se tocan/);
  });
});
