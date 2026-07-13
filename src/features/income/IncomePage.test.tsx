import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { IncomePage } from './IncomePage';
import { ok } from '../../test/mockResponse';

const activeSource = {
  id: 'src1',
  name: 'Sueldo',
  currency: 'ARS',
  active: true,
  createdAt: '2026-01-01T00:00:00',
};

const inactiveSource = {
  id: 'src2',
  name: 'Freelance viejo',
  currency: 'ARS',
  active: false,
  createdAt: '2026-01-01T00:00:00',
};

const account = {
  id: 'acc1',
  name: 'Cuenta Ahorro',
  type: 'CASH',
  currency: 'ARS',
  balance: 500000,
  createdAt: '2026-01-01T00:00:00',
};

const entry = {
  id: 'e1',
  incomeSourceId: 'src1',
  sourceName: 'Sueldo',
  accountId: 'acc1',
  amount: 250000,
  currency: 'ARS',
  date: '2026-07-05',
  notes: null,
  transactionId: 't1',
  createdAt: '2026-07-05T10:00:00Z',
};

const entriesPageFixture = {
  content: [entry],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

function stubEndpoints(options?: {
  sources?: unknown[];
  entriesPage?: unknown;
  accounts?: unknown[];
  onPost?: (body: Record<string, unknown>) => void;
  postResponse?: unknown;
}) {
  const sources = options?.sources ?? [activeSource, inactiveSource];
  const entriesPage = options?.entriesPage ?? entriesPageFixture;
  const accounts = options?.accounts ?? [account];

  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      const url = String(input);
      if (url.includes('/income-entries') && requestInit?.method === 'POST') {
        const body = JSON.parse(requestInit.body as string);
        options?.onPost?.(body);
        return ok(options?.postResponse ?? { ...entry, accountBalance: 999 });
      }
      if (url.includes('/income-sources')) return ok(sources);
      if (url.includes('/income-entries')) return ok(entriesPage);
      if (url.includes('/accounts')) return ok(accounts);
      throw new Error('URL inesperada: ' + url);
    }),
  );
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <MemoryRouter>
          <IncomePage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IncomePage', () => {
  it('renderiza los tres headings y los datos de los fixtures', async () => {
    stubEndpoints();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Registrar ingreso' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fuentes de ingreso' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ingresos recientes' })).toBeInTheDocument();

    // sourceName de la entry (aparece también en la lista de fuentes)
    expect((await screen.findAllByText('Sueldo')).length).toBeGreaterThan(0);
    expect(await screen.findByText('+$ 250.000,00')).toBeInTheDocument();
  });

  it('fuente inactiva: aparece "(inactiva)" en la lista y no está como option del select', async () => {
    stubEndpoints();
    renderPage();

    expect(await screen.findByText('Freelance viejo')).toBeInTheDocument();
    expect(screen.getByText('(inactiva)')).toBeInTheDocument();

    const sourceSelect = screen.getByLabelText('Fuente') as HTMLSelectElement;
    const optionLabels = Array.from(sourceSelect.options).map((o) => o.textContent);
    expect(optionLabels.some((label) => label?.includes('Freelance viejo'))).toBe(false);
    expect(optionLabels.some((label) => label?.includes('Sueldo'))).toBe(true);
  });

  it('submit del form: manda POST con los datos y muestra el mensaje de éxito', async () => {
    let postedBody: Record<string, unknown> | undefined;
    stubEndpoints({
      onPost: (body) => {
        postedBody = body;
      },
      postResponse: { ...entry, accountBalance: 999 },
    });
    renderPage();

    // el select existe recién cuando las fuentes cargaron — esperar el label, no el heading
    fireEvent.change(await screen.findByLabelText('Fuente'), { target: { value: 'src1' } });
    fireEvent.change(screen.getByLabelText('Cuenta destino'), { target: { value: 'acc1' } });
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText(/Ingreso registrado/)).toBeInTheDocument();
    expect(postedBody).toMatchObject({
      incomeSourceId: 'src1',
      accountId: 'acc1',
      amount: 10000,
    });
    expect(postedBody?.date).toBeTruthy();
  });

  it('sin fuentes activas: muestra el mensaje y no el select', async () => {
    stubEndpoints({ sources: [inactiveSource] });
    renderPage();

    expect(
      await screen.findByText('Creá una fuente de ingreso activa para registrar ingresos.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Fuente')).not.toBeInTheDocument();
  });

  it('empty states de fuentes y de ingresos', async () => {
    stubEndpoints({
      sources: [],
      entriesPage: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
    });
    renderPage();

    expect(
      await screen.findByText('Todavía no tenés fuentes de ingreso. Creá una para registrar ingresos.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Todavía no registraste ingresos.')).toBeInTheDocument();
  });
});
