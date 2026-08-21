import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ExportSection } from './ExportSection';
import { ExportTransactionsButton } from './ExportTransactionsButton';
import { jsonResponse } from '../../test/mockResponse';
import { selectOption } from '../../test/selectOption';

// jsdom no implementa createObjectURL/revokeObjectURL ni la descarga de un <a download>:
// los espiamos para verificar que la descarga se dispara y que la URL efímera se libera.
const createdUrls: string[] = [];
const revokedUrls: string[] = [];
const downloads: { filename: string; href: string }[] = [];
const requests: { url: string; auth?: string }[] = [];

function blobResponse(contentDisposition?: string) {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name === 'Content-Disposition' ? contentDisposition ?? null : null) },
    blob: () => Promise.resolve(new Blob(['xlsx'])),
    json: () => Promise.resolve({}),
  } as unknown as Response);
}

function stubFetch(handler: (url: string, options?: RequestInit) => Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      requests.push({
        url,
        auth: (options?.headers as Record<string, string> | undefined)?.Authorization,
      });
      return handler(url, options);
    }),
  );
}

function wrap(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: vi.fn() }}
      >
        <ToastProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  createdUrls.length = 0;
  revokedUrls.length = 0;
  downloads.length = 0;
  requests.length = 0;

  let n = 0;
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => {
      const url = `blob:mock-${++n}`;
      createdUrls.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn((url: string) => revokedUrls.push(url)),
  });

  // El click del <a download> en jsdom no navega; capturamos el intento.
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({ filename: this.download, href: this.href });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const exportCalls = () => requests.filter((r) => r.url.includes('/export/'));

describe('ExportSection (/datos)', () => {
  it('exporta el dataset elegido y usa el nombre del Content-Disposition', async () => {
    stubFetch((url) =>
      url.includes('/export/')
        ? blobResponse('attachment; filename="maat-gastos-20260724.xlsx"')
        : jsonResponse(200, []),
    );
    wrap(<ExportSection />);

    await selectOption('Qué exportar', 'expenses');
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(exportCalls()[0].url).toContain('/export/expenses');
    expect(downloads[0].filename).toBe('maat-gastos-20260724.xlsx');
    // La URL efímera se libera: si no, el Blob queda vivo hasta recargar la página.
    expect(revokedUrls).toEqual(createdUrls);
  });

  it('la descarga va autenticada (Bearer), no como un <a href> pelado', async () => {
    stubFetch((url) => (url.includes('/export/') ? blobResponse() : jsonResponse(200, [])));
    wrap(<ExportSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    await waitFor(() => expect(exportCalls()).toHaveLength(1));
    expect(exportCalls()[0].auth).toBe('Bearer test-token');
  });

  it('sin Content-Disposition cae al nombre armado en el cliente', async () => {
    stubFetch((url) => (url.includes('/export/') ? blobResponse() : jsonResponse(200, [])));
    wrap(<ExportSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0].filename).toMatch(/^maat-transacciones-\d{8}\.xlsx$/);
  });

  it('el selector de cuenta aparece sólo en "Movimientos por cuenta" y viaja en la query', async () => {
    stubFetch((url) =>
      url.includes('/export/')
        ? blobResponse()
        : jsonResponse(200, [{ id: 'acc-1', name: 'Efectivo', currency: 'ARS', balance: 0, type: 'CASH' }]),
    );
    wrap(<ExportSection />);

    expect(screen.queryByLabelText('Cuenta')).not.toBeInTheDocument();
    await selectOption('Qué exportar', 'accounts');
    await selectOption('Cuenta', 'acc-1');
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    await waitFor(() => expect(exportCalls()).toHaveLength(1));
    expect(exportCalls()[0].url).toContain('/export/accounts?accountId=acc-1');
  });

  it('un error del server sale como toast, sin descarga', async () => {
    stubFetch((url) =>
      url.includes('/export/')
        ? jsonResponse(400, { error: 'INVALID_DATE_RANGE' })
        : jsonResponse(200, []),
    );
    wrap(<ExportSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    expect(await screen.findByText(/no puede ser posterior/i)).toBeInTheDocument();
    expect(downloads).toHaveLength(0);
  });
});

describe('ExportTransactionsButton', () => {
  const filters = { accountId: 'acc-1', type: 'EXPENSE' as const };

  it('sin filtros descarga el dump directo, sin preguntar', async () => {
    stubFetch(() => blobResponse());
    wrap(<ExportTransactionsButton filters={{}} hasFilters={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    await waitFor(() => expect(exportCalls()).toHaveLength(1));
    expect(exportCalls()[0].url).toMatch(/\/export\/transactions$/);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('con filtros pregunta y "Con los filtros aplicados" los manda', async () => {
    stubFetch(() => blobResponse());
    wrap(<ExportTransactionsButton filters={filters} hasFilters />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Con los filtros aplicados' }));

    await waitFor(() => expect(exportCalls()).toHaveLength(1));
    expect(exportCalls()[0].url).toContain('/export/transactions?accountId=acc-1&type=EXPENSE');
  });

  it('con filtros, "Todo" descarga sin ninguno', async () => {
    stubFetch(() => blobResponse());
    wrap(<ExportTransactionsButton filters={filters} hasFilters />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Todo' }));

    await waitFor(() => expect(exportCalls()).toHaveLength(1));
    expect(exportCalls()[0].url).toMatch(/\/export\/transactions$/);
  });

  it('Cancelar cierra el cartel sin descargar nada', async () => {
    stubFetch(() => blobResponse());
    wrap(<ExportTransactionsButton filters={filters} hasFilters />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(exportCalls()).toHaveLength(0);
  });

  // El refactor de S26 hace que useHttpBlob comparta el silent-refresh de useHttp: un 401
  // en la descarga tiene que refrescar y reintentar, no tirar al usuario a /login.
  it('401 en la descarga → refresh y retry, transparente', async () => {
    stubFetch((url, options) => {
      const auth = (options?.headers as Record<string, string> | undefined)?.Authorization;
      if (url.includes('/auth/refresh')) return jsonResponse(200, { accessToken: 'new-token' });
      if (auth === 'Bearer new-token') return blobResponse();
      return jsonResponse(401, { error: 'UNAUTHORIZED' });
    });
    wrap(<ExportTransactionsButton filters={{}} hasFilters={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(requests.map((r) => r.auth)).toContain('Bearer new-token');
  });
});
