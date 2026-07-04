import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { PaymentMethodsPage } from './PaymentMethodsPage';
import type { PaymentMethod } from './api';

const visa: PaymentMethod = {
  id: 'pm-1',
  userId: 'user-1',
  name: 'Tarjeta Visa',
  type: 'CREDIT',
  isDefault: true,
  createdAt: '2026-07-01T00:00:00',
};

const cash: PaymentMethod = {
  id: 'pm-2',
  userId: 'user-1',
  name: 'Plata en mano',
  type: 'CASH',
  isDefault: false,
  createdAt: '2026-07-01T00:00:00',
};

function jsonResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
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
        <PaymentMethodsPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function rowOf(name: string) {
  const cell = screen.getByText(name);
  const row = cell.closest('tr');
  if (!row) throw new Error(`no row for ${name}`);
  return within(row);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PaymentMethodsPage', () => {
  it('lista con badge de default solo en el método por defecto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(200, [visa, cash]))),
    );

    renderPage();

    expect(await screen.findByText('Tarjeta Visa')).toBeInTheDocument();
    expect(rowOf('Tarjeta Visa').getByText('★ Sí')).toBeInTheDocument();
    expect(rowOf('Plata en mano').getByText('—')).toBeInTheDocument();
  });

  it('crear manda POST con name/type/isDefault y refresca la lista', async () => {
    let created = false;
    let postBody: Record<string, unknown> | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          created = true;
          postBody = JSON.parse(options.body as string);
          return Promise.resolve(jsonResponse(201, { ...cash, id: 'pm-new', name: postBody!.name }));
        }
        return Promise.resolve(jsonResponse(200, created ? [visa, { ...cash, id: 'pm-new', name: 'MP' }] : [visa]));
      }),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo método de pago' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'MP' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'DIGITAL_WALLET' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('MP')).toBeInTheDocument();
    expect(postBody).toEqual({ name: 'MP', type: 'DIGITAL_WALLET', isDefault: false });
  });

  it('default único: marcar default en edición manda PATCH {isDefault:true} y el badge se mueve', async () => {
    let patched = false;
    let patchBody: Record<string, unknown> | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'PATCH') {
          patched = true;
          patchBody = JSON.parse(options.body as string);
          expect(url).toContain('/payment-methods/pm-2');
          return Promise.resolve(jsonResponse(200, { ...cash, isDefault: true }));
        }
        // El backend garantiza default único: al re-fetchear, visa ya no es default
        const list = patched
          ? [{ ...visa, isDefault: false }, { ...cash, isDefault: true }]
          : [visa, cash];
        return Promise.resolve(jsonResponse(200, list));
      }),
    );

    renderPage();
    await screen.findByText('Plata en mano');
    fireEvent.click(rowOf('Plata en mano').getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByLabelText(/método por defecto/));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(rowOf('Plata en mano').getByText('★ Sí')).toBeInTheDocument();
      expect(rowOf('Tarjeta Visa').getByText('—')).toBeInTheDocument();
    });
    expect(patchBody).toEqual({ isDefault: true });
  });

  it('borrar con confirmación maneja el 204 sin body y saca la fila', async () => {
    let deleted = false;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        if (options?.method === 'DELETE') {
          deleted = true;
          return Promise.resolve({ ok: true, status: 204 } as Response);
        }
        return Promise.resolve(jsonResponse(200, deleted ? [visa] : [visa, cash]));
      }),
    );

    renderPage();
    await screen.findByText('Plata en mano');
    fireEvent.click(rowOf('Plata en mano').getByRole('button', { name: 'Borrar' }));
    fireEvent.click(rowOf('Plata en mano').getByRole('button', { name: 'Sí' }));

    await waitFor(() => {
      expect(screen.queryByText('Plata en mano')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Tarjeta Visa')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('error del server al borrar muestra mensaje y la fila vuelve a estado normal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        if (options?.method === 'DELETE') {
          return Promise.resolve(
            jsonResponse(404, { error: 'PAYMENT_METHOD_NOT_FOUND', message: 'gone' }),
          );
        }
        return Promise.resolve(jsonResponse(200, [cash]));
      }),
    );

    renderPage();
    await screen.findByText('Plata en mano');
    fireEvent.click(rowOf('Plata en mano').getByRole('button', { name: 'Borrar' }));
    fireEvent.click(rowOf('Plata en mano').getByRole('button', { name: 'Sí' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El método de pago no existe o fue borrado.',
    );
    // onSettled resetea la confirmación (fix 8-2): vuelven Editar/Borrar
    expect(rowOf('Plata en mano').getByRole('button', { name: 'Borrar' })).toBeInTheDocument();
  });
});
