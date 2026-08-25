import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { WhatsAppSection } from './WhatsAppSection';
import { ok } from '../../test/mockResponse';
import type { WhatsAppLinkStatus } from './api';

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

function status(overrides: Partial<WhatsAppLinkStatus>): WhatsAppLinkStatus {
  return {
    configured: true,
    linked: false,
    code: null,
    codeExpiresAt: null,
    deepLink: null,
    maskedPhone: null,
    ...overrides,
  };
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
});

describe('WhatsAppSection', () => {
  // Misma regla que TelegramSection con botUsername null: sin canal configurado no se dibuja
  // nada. Si no, en dev aparece una tarjeta que no puede funcionar y el usuario genera codigos
  // que no vinculan nada.
  it('no se dibuja si el canal no esta configurado', async () => {
    stubFetch(() => ok(status({ configured: false })));

    const { container } = wrap(<WhatsAppSection />);

    await waitFor(() => expect(requests.some((r) => r.url.includes('/whatsapp/link'))).toBe(true));
    expect(container.querySelector('h2')).toBeNull();
  });

  it('sin vincular ofrece generar el codigo', async () => {
    stubFetch(() => ok(status({})));

    wrap(<WhatsAppSection />);

    expect(await screen.findByText('Bot de WhatsApp')).toBeInTheDocument();
    expect(await screen.findByText('No conectado.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Generar código' })).toBeInTheDocument();
  });

  it('con codigo vivo muestra el codigo y el deep link', async () => {
    stubFetch(() =>
      ok(status({ code: 'ABC234', deepLink: 'https://wa.me/5491100000000?text=ABC234' })),
    );

    wrap(<WhatsAppSection />);

    expect(await screen.findByText('ABC234')).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: 'Abrir el chat con el código escrito' });
    expect(link).toHaveAttribute('href', 'https://wa.me/5491100000000?text=ABC234');
  });

  // El deep link es una comodidad, no el mecanismo de vinculacion. Sin numero de negocio
  // configurado el codigo tiene que seguir siendo usable a mano.
  it('sin deep link caen las instrucciones a mano', async () => {
    stubFetch(() => ok(status({ code: 'ABC234', deepLink: null })));

    wrap(<WhatsAppSection />);

    expect(await screen.findByText('ABC234')).toBeInTheDocument();
    expect(await screen.findByText(/Mandale este código/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Abrir el chat/ })).toBeNull();
  });

  it('vinculado muestra el telefono ENMASCARADO y permite desvincular', async () => {
    stubFetch((_url, options) => {
      if (options?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }));
      return ok(status({ linked: true, maskedPhone: '+54 ****4444' }));
    });

    wrap(<WhatsAppSection />);

    expect(await screen.findByText('Conectado')).toBeInTheDocument();
    expect(await screen.findByText('+54 ****4444')).toBeInTheDocument();
    // El numero entero no puede aparecer nunca: es la primera PII del sistema.
    expect(screen.queryByText(/5491133334444/)).toBeNull();

    // Dos taps: el de la tarjeta abre el ConfirmDialog, el del dialogo confirma. Los dos se
    // llaman igual, asi que hay que tomarlos por posicion y no por nombre.
    fireEvent.click(await screen.findByRole('button', { name: 'Desvincular' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Desvincular' }).length).toBeGreaterThan(1),
    );
    const botones = screen.getAllByRole('button', { name: 'Desvincular' });
    fireEvent.click(botones[botones.length - 1]);

    await waitFor(() =>
      expect(requests.some((r) => r.method === 'DELETE' && r.url.includes('/whatsapp/link'))).toBe(
        true,
      ),
    );
  });
});
