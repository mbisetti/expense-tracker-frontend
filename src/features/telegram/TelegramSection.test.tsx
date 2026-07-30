import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { TelegramSection } from './TelegramSection';
import { jsonResponse } from '../../test/mockResponse';
import type { TelegramLinkStatus } from './api';

const requests: { url: string; method?: string }[] = [];

function stubFetch(handler: (url: string, options?: RequestInit) => Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      requests.push({ url, method: options?.method });
      return handler(url, options);
    }),
  );
}

function status(overrides: Partial<TelegramLinkStatus>): TelegramLinkStatus {
  return { linked: false, botUsername: 'ManguitosBot', code: null, codeExpiresAt: null, ...overrides };
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

beforeEach(() => {
  requests.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('TelegramSection', () => {
  it('no se renderiza si el backend no tiene bot configurado', async () => {
    stubFetch(() => jsonResponse(200, status({ botUsername: null })));
    wrap(<TelegramSection />);

    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    expect(screen.queryByText('Bot de Telegram')).toBeNull();
  });

  it('generar código muestra el código y el link al bot', async () => {
    let generated = false;
    stubFetch((url) => {
      if (url.includes('/telegram/link-code')) {
        generated = true;
        return jsonResponse(200, status({ code: 'ABC234', codeExpiresAt: '2026-07-30T12:00:00' }));
      }
      return jsonResponse(200, generated ? status({ code: 'ABC234' }) : status({}));
    });
    wrap(<TelegramSection />);

    fireEvent.click(await screen.findByRole('button', { name: 'Generar código' }));

    expect(await screen.findByText('ABC234')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: '@ManguitosBot' });
    expect(link).toHaveAttribute('href', 'https://t.me/ManguitosBot');
  });

  it('desvincular pide confirmación y pega al DELETE', async () => {
    stubFetch((_url, options) => {
      if (options?.method === 'DELETE') return jsonResponse(204);
      return jsonResponse(200, status({ linked: true }));
    });
    wrap(<TelegramSection />);

    fireEvent.click(await screen.findByRole('button', { name: 'Desvincular' }));
    // El ConfirmDialog repite el label en su botón primario.
    const confirmButtons = await screen.findAllByRole('button', { name: 'Desvincular' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await screen.findByText('Bot desvinculado.');
    expect(requests.some((r) => r.method === 'DELETE' && r.url.includes('/telegram/link'))).toBe(true);
  });
});
