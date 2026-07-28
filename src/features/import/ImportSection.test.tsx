import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ImportSection } from './ImportSection';
import { jsonResponse } from '../../test/mockResponse';
import type { ImportReport } from './api';

const requests: { url: string; method?: string; body?: unknown }[] = [];

const OK_REPORT: ImportReport = {
  dryRun: true,
  totalRows: 1,
  validCount: 1,
  warningCount: 0,
  errorCount: 0,
  duplicateCount: 0,
  imported: 0,
  batchId: null,
  rows: [
    {
      rowNumber: 2,
      status: 'OK',
      date: '2026-07-15',
      description: 'Chino',
      categoryName: null,
      accountName: 'Efectivo',
      paymentMethodName: null,
      type: 'EXPENSE',
      currency: 'ARS',
      amount: 1500,
      issues: [],
    },
  ],
};

function stubFetch(handler: (url: string, options?: RequestInit) => Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      requests.push({ url, method: options?.method, body: options?.body });
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
        <ToastProvider>{children}</ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function pickFile() {
  const input = screen.getByLabelText('Archivo de movimientos');
  fireEvent.change(input, {
    target: { files: [new File(['xlsx'], 'julio.xlsx')] },
  });
}

const importCalls = () => requests.filter((r) => r.url.includes('/import/transactions?'));

beforeEach(() => {
  requests.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ImportSection', () => {
  it('subir un archivo dispara el dry-run y abre el preview', async () => {
    stubFetch((url) => {
      if (url.includes('/import/batches')) return jsonResponse(200, []);
      return jsonResponse(200, OK_REPORT);
    });
    wrap(<ImportSection />);

    pickFile();

    await screen.findByText('Revisar import');
    expect(importCalls()[0].url).toContain('dryRun=true');
    // El archivo viaja como multipart (FormData), nunca como JSON.
    expect(importCalls()[0].body).toBeInstanceOf(FormData);
  });

  it('confirmar re-sube el archivo con dryRun=false y avisa cuántos entraron', async () => {
    stubFetch((url) => {
      if (url.includes('/import/batches')) return jsonResponse(200, []);
      if (url.includes('dryRun=false')) {
        return jsonResponse(200, { ...OK_REPORT, dryRun: false, imported: 1, batchId: 'b1' });
      }
      return jsonResponse(200, OK_REPORT);
    });
    wrap(<ImportSection />);

    pickFile();
    fireEvent.click(await screen.findByRole('button', { name: 'Importar 1 movimiento' }));

    await screen.findByText('Se importó 1 movimiento.');
    expect(importCalls().map((r) => r.url)).toEqual([
      expect.stringContaining('dryRun=true'),
      expect.stringContaining('dryRun=false'),
    ]);
    // El modal se cierra tras el éxito.
    await waitFor(() => expect(screen.queryByText('Revisar import')).toBeNull());
  });

  it('un archivo ilegible muestra el mensaje del server y no abre el preview', async () => {
    stubFetch((url) => {
      if (url.includes('/import/batches')) return jsonResponse(200, []);
      return jsonResponse(400, { error: 'INVALID_FILE', message: 'El archivo no es un .xlsx legible' });
    });
    wrap(<ImportSection />);

    pickFile();

    await screen.findByText('El archivo no es un .xlsx legible');
    expect(screen.queryByText('Revisar import')).toBeNull();
  });

  it('deshacer un import pide confirmación y pega al DELETE', async () => {
    stubFetch((url, options) => {
      if (options?.method === 'DELETE') return jsonResponse(204);
      if (url.includes('/import/batches')) {
        return jsonResponse(200, [
          { id: 'b1', filename: 'julio.xlsx', createdAt: '2026-07-28T10:00:00', rowCount: 12, undoneAt: null },
        ]);
      }
      return jsonResponse(200, OK_REPORT);
    });
    wrap(<ImportSection />);

    fireEvent.click(await screen.findByRole('button', { name: 'Deshacer' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Deshacer import' }));

    await screen.findByText('Import deshecho: sus movimientos se borraron.');
    expect(requests.some((r) => r.method === 'DELETE' && r.url.includes('/import/batches/b1'))).toBe(true);
  });

  it('un import deshecho queda marcado y sin botón', async () => {
    stubFetch((url) => {
      if (url.includes('/import/batches')) {
        return jsonResponse(200, [
          { id: 'b1', filename: 'julio.xlsx', createdAt: '2026-07-28T10:00:00', rowCount: 12, undoneAt: '2026-07-28T11:00:00' },
        ]);
      }
      return jsonResponse(200, OK_REPORT);
    });
    wrap(<ImportSection />);

    await screen.findByText('Deshecho');
    expect(screen.queryByRole('button', { name: 'Deshacer' })).toBeNull();
  });
});
