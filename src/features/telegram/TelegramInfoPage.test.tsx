import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { TelegramInfoPage } from './TelegramInfoPage';
import { jsonResponse } from '../../test/mockResponse';

const requests: { url: string; method?: string; body?: string }[] = [];

function stubFetch(handler: (url: string, options?: RequestInit) => Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      requests.push({ url, method: options?.method, body: options?.body as string });
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
  requests.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('TelegramInfoPage', () => {
  it('muestra funciones y comandos', async () => {
    stubFetch(() =>
      jsonResponse(200, { linked: true, botUsername: 'ThothBot', code: null, codeExpiresAt: null }),
    );
    wrap(<TelegramInfoPage />);

    expect(screen.getByRole('heading', { name: 'El bot de Telegram' })).toBeInTheDocument();
    expect(screen.getByText('Qué le podés mandar')).toBeInTheDocument();
    expect(screen.getByText('La foto del ticket')).toBeInTheDocument();
    // S39: el PDF del extracto o del resumen entra a la lista de lo que sabe leer.
    expect(screen.getByText('El PDF del extracto o del resumen de la tarjeta')).toBeInTheDocument();
    expect(screen.getByText('/resumen')).toBeInTheDocument();
    expect(screen.getByText('/saldo')).toBeInTheDocument();
    expect(screen.getByText('/tarjeta')).toBeInTheDocument();

    const bot = await screen.findByRole('link', { name: 'Abrir @ThothBot en Telegram' });
    expect(bot).toHaveAttribute('href', 'https://t.me/ThothBot');
  });

  it('enviar una recomendación pega al POST con el contexto del bot y limpia el campo', async () => {
    stubFetch((url) => {
      if (url.includes('/feedback')) return jsonResponse(204);
      return jsonResponse(200, { linked: true, botUsername: null, code: null, codeExpiresAt: null });
    });
    wrap(<TelegramInfoPage />);

    const box = screen.getByPlaceholderText('Por ejemplo: que me avise cuando vence una cuota');
    fireEvent.change(box, { target: { value: 'que avise los vencimientos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await screen.findByText('¡Gracias! Las leemos todas.');
    const post = requests.find((r) => r.url.includes('/feedback'));
    expect(post?.method).toBe('POST');
    expect(post?.body).toContain('"context":"telegram-bot"');
    expect(post?.body).toContain('que avise los vencimientos');
    expect(box).toHaveValue('');
  });

  it('el botón queda deshabilitado con el campo vacío', () => {
    stubFetch(() =>
      jsonResponse(200, { linked: false, botUsername: null, code: null, codeExpiresAt: null }),
    );
    wrap(<TelegramInfoPage />);

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });
});
