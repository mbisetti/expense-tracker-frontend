import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { TransactionsPage } from './TransactionsPage';

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response;
}

const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <TransactionsPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/transactions')) return Promise.resolve(jsonResponse(emptyPage));
        return Promise.resolve(jsonResponse([]));
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el empty state cuando no hay transacciones', async () => {
    renderPage();
    expect(await screen.findByText('No hay transacciones para mostrar.')).toBeInTheDocument();
  });

  it('manda el Authorization header en el request', async () => {
    renderPage();
    await screen.findByText('No hay transacciones para mostrar.');
    const fetchMock = vi.mocked(fetch);
    const [, options] = fetchMock.mock.calls[0];
    expect((options?.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });
});
