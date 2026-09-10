import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { PaymentMethodsPage } from './PaymentMethodsPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import type { PaymentMethod } from './api';
import type { Account } from '../accounts/api';
import { jsonResponse } from '../../test/mockResponse';

// S50: la pantalla pasó de una tabla plana a secciones por cuenta, y el "default" pasó de ser un
// flag del método (único por usuario) a un puntero de la CUENTA que puede apuntar a un método o a
// una tarjeta vinculada. Estos tests se reescribieron enteros por eso.

const santander: Account = {
  id: 'acc-1',
  name: 'Santander',
  type: 'BANK',
  currency: 'ARS',
  balance: 0,
  isInformal: false,
  createdAt: '2026-07-01T00:00:00',
  statementCloseDay: null,
  paymentDueDay: null,
  balances: [],
  institution: null,
  linkedAccountId: null,
  defaultPaymentMethodId: 'pm-1',
  defaultCardAccountId: null,
};

const efectivo: Account = {
  ...santander,
  id: 'acc-2',
  name: 'Efectivo',
  type: 'CASH',
  defaultPaymentMethodId: null,
};

// Tarjeta vinculada al Santander: aparece DENTRO de su sección, no como sección propia.
const visaCard: Account = {
  ...santander,
  id: 'acc-card',
  name: 'Visa Santander',
  type: 'CREDIT',
  linkedAccountId: 'acc-1',
  defaultPaymentMethodId: null,
};

// Cuenta sistema (S40 D7): no se le paga con nada, se le transfiere. No lleva sección.
const deudas: Account = {
  ...santander,
  id: 'acc-sys',
  name: 'Deudas con amigos',
  type: 'DEBT',
  defaultPaymentMethodId: null,
  systemRole: 'FRIEND_DEBTS',
};

const transferencia: PaymentMethod = {
  id: 'pm-1',
  userId: 'user-1',
  accountId: 'acc-1',
  name: 'Transferencia bancaria',
  type: 'TRANSFER',
  isDefault: true,
  createdAt: '2026-07-01T00:00:00',
};

const debito: PaymentMethod = {
  id: 'pm-2',
  userId: 'user-1',
  accountId: 'acc-1',
  name: 'Débito Santander',
  type: 'DEBIT',
  isDefault: false,
  createdAt: '2026-07-01T00:00:00',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <PaymentMethodsPage />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function section(accountName: string) {
  return within(screen.getByRole('region', { name: accountName }));
}

/** El radio de una fila, buscado por su etiqueta dentro de la sección de la cuenta. */
function radioIn(accountName: string, label: string | RegExp) {
  return section(accountName).getByRole('radio', { name: label });
}

function deleteDialog() {
  return screen.getByRole('dialog', { name: 'Borrar método de pago' });
}

/**
 * El stub por defecto: dos cuentas con sección, una tarjeta vinculada y una cuenta sistema.
 *
 * El PUT del predeterminado se aplica sobre el estado local ANTES de contestar 204. Sin eso el
 * refetch de `onSettled` devuelve el puntero viejo y le pisa el update optimista al radio, que es
 * el bug del TEST y no del código.
 */
function stubFetch(
  overrides: (url: string, options?: RequestInit) => Response | Promise<Response> | null = () =>
    null,
) {
  const state: Account[] = [santander, efectivo, visaCard, deudas];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      const custom = overrides(url, options);
      if (custom) return custom;
      if (options?.method === 'PUT' && url.includes('/default-method')) {
        const accountId = url.split('/accounts/')[1].split('/')[0];
        const body = JSON.parse(options.body as string);
        const index = state.findIndex((a) => a.id === accountId);
        state[index] = {
          ...state[index],
          defaultPaymentMethodId: body.paymentMethodId,
          defaultCardAccountId: body.cardAccountId,
        };
        return new Response(null, { status: 204 });
      }
      if (url.includes('/accounts')) return jsonResponse(200, [...state]);
      return jsonResponse(200, [transferencia, debito]);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PaymentMethodsPage', () => {
  it('agrupa los métodos por cuenta, con una sección por cuenta', async () => {
    stubFetch();
    renderPage();

    await screen.findByRole('region', { name: 'Santander' });
    expect(section('Santander').getByText('Transferencia bancaria')).toBeInTheDocument();
    expect(section('Santander').getByText('Débito Santander')).toBeInTheDocument();
    // La cuenta sin métodos existe igual, y lo dice.
    expect(section('Efectivo').getByText('Esta cuenta no tiene métodos todavía.')).toBeInTheDocument();
  });

  it('no le da sección propia ni a las tarjetas vinculadas ni a las cuentas sistema', async () => {
    stubFetch();
    renderPage();

    await screen.findByRole('region', { name: 'Santander' });
    expect(screen.queryByRole('region', { name: 'Visa Santander' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Deudas con amigos' })).not.toBeInTheDocument();
  });

  it('muestra la tarjeta vinculada dentro de su cuenta madre, etiquetada y sin lápiz', async () => {
    stubFetch();
    renderPage();

    await screen.findByRole('region', { name: 'Santander' });
    expect(section('Santander').getByText('Visa Santander')).toBeInTheDocument();
    expect(section('Santander').getByText('Tarjeta vinculada')).toBeInTheDocument();
    // Es una CUENTA: se edita en Cuentas, no acá.
    expect(
      section('Santander').queryByRole('button', { name: 'Editar Visa Santander' }),
    ).not.toBeInTheDocument();
  });

  it('marca el predeterminado que viene del puntero de la cuenta', async () => {
    stubFetch();
    renderPage();

    await screen.findByRole('region', { name: 'Santander' });
    expect(radioIn('Santander', /Transferencia bancaria/)).toBeChecked();
    expect(radioIn('Santander', /Débito Santander/)).not.toBeChecked();
    // Sin predeterminado, "Ninguno" es el marcado.
    expect(radioIn('Efectivo', 'Ninguno')).toBeChecked();
  });

  it('elegir un método manda el PUT del predeterminado y mueve el radio al toque', async () => {
    let putBody: Record<string, unknown> | null = null;
    let putUrl = '';
    // Espía que NO cortocircuita: devuelve null para que el stub aplique el cambio al estado.
    stubFetch((url, options) => {
      if (options?.method === 'PUT') {
        putUrl = url;
        putBody = JSON.parse(options.body as string);
      }
      return null;
    });
    renderPage();

    await screen.findByRole('region', { name: 'Santander' });
    fireEvent.click(radioIn('Santander', /Débito Santander/));

    // Optimista: el radio se mueve antes de que el refetch conteste.
    await waitFor(() => expect(radioIn('Santander', /Débito Santander/)).toBeChecked());
    expect(putUrl).toContain('/accounts/acc-1/default-method');
    expect(putBody).toEqual({ paymentMethodId: 'pm-2', cardAccountId: null });
  });

  it('elegir la tarjeta vinculada manda cardAccountId y no paymentMethodId', async () => {
    let putBody: Record<string, unknown> | null = null;
    stubFetch((_url, options) => {
      if (options?.method === 'PUT') putBody = JSON.parse(options.body as string);
      return null;
    });
    renderPage();

    await screen.findByRole('region', { name: 'Santander' });
    fireEvent.click(radioIn('Santander', /Visa Santander/));

    await waitFor(() => expect(putBody).toEqual({ paymentMethodId: null, cardAccountId: 'acc-card' }));
  });

  it('"Ninguno" limpia el predeterminado con los dos ids en null', async () => {
    let putBody: Record<string, unknown> | null = null;
    stubFetch((_url, options) => {
      if (options?.method === 'PUT') putBody = JSON.parse(options.body as string);
      return null;
    });
    renderPage();

    await screen.findByRole('region', { name: 'Santander' });
    fireEvent.click(radioIn('Santander', 'Ninguno'));

    await waitFor(() => expect(putBody).toEqual({ paymentMethodId: null, cardAccountId: null }));
    // El toast de exito va con role=status; alert es solo para errores (ver Toast.tsx).
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Santander quedó sin método por defecto.',
    );
  });

  it('si el server rechaza el predeterminado, el radio vuelve y hay toast', async () => {
    stubFetch((_url, options) => {
      if (options?.method === 'PUT') {
        return jsonResponse(400, { error: 'CARD_NOT_OF_ACCOUNT', message: 'nope' });
      }
      return null;
    });
    renderPage();

    await screen.findByRole('region', { name: 'Santander' });
    fireEvent.click(radioIn('Santander', /Débito Santander/));

    expect(await screen.findByRole('alert')).toHaveTextContent('Esa tarjeta no es de esta cuenta.');
    // Rollback: el predeterminado vuelve a ser el que era.
    await waitFor(() => expect(radioIn('Santander', /Transferencia bancaria/)).toBeChecked());
  });

  it('"Agregar método" abre el formulario con la cuenta ya fijada', async () => {
    let postBody: Record<string, unknown> | null = null;
    stubFetch((_url, options) => {
      if (options?.method === 'POST') {
        postBody = JSON.parse(options.body as string);
        return jsonResponse(201, { ...debito, id: 'pm-new', name: 'MP' });
      }
      return null;
    });
    renderPage();

    await screen.findByRole('region', { name: 'Efectivo' });
    fireEvent.click(section('Efectivo').getByRole('button', { name: 'Agregar método' }));

    // No hay SELECTOR de cuenta: la cuenta llega fijada y se muestra como texto. Se busca por
    // rol y no por label: "Cuenta" como substring también engancha el checkbox del predeterminado.
    expect(screen.queryByRole('combobox', { name: /Cuenta/ })).not.toBeInTheDocument();
    // Por el renglon completo: "Efectivo" solo aparece varias veces en la pantalla.
    expect(within(screen.getByRole('dialog')).getByText(/^Cuenta:/)).toHaveTextContent(
      'Cuenta: Efectivo',
    );

    fireEvent.change(screen.getByLabelText('Nombre', { exact: false }), { target: { value: 'MP' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(postBody).toEqual({
        accountId: 'acc-2',
        name: 'MP',
        type: 'CASH',
        isDefault: false,
      }),
    );
  });

  it('borrar con confirmación maneja el 204 sin body y saca la fila', async () => {
    let deleted = false;
    stubFetch((url, options) => {
      if (options?.method === 'DELETE') {
        deleted = true;
        return new Response(null, { status: 204 });
      }
      if (url.includes('/payment-methods')) {
        return jsonResponse(200, deleted ? [transferencia] : [transferencia, debito]);
      }
      return null;
    });
    renderPage();

    await screen.findByText('Débito Santander');
    fireEvent.click(
      section('Santander').getByRole('button', { name: 'Editar Débito Santander' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    fireEvent.click(within(deleteDialog()).getByRole('button', { name: 'Borrar' }));

    await waitFor(() => expect(screen.queryByText('Débito Santander')).not.toBeInTheDocument());
    expect(screen.getByText('Transferencia bancaria')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cancelar el ConfirmDialog no borra el método de pago', async () => {
    stubFetch((_url, options) => {
      if (options?.method === 'DELETE') throw new Error('no debería llamarse');
      return null;
    });
    renderPage();

    await screen.findByText('Débito Santander');
    fireEvent.click(
      section('Santander').getByRole('button', { name: 'Editar Débito Santander' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    fireEvent.click(within(deleteDialog()).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Débito Santander')).toBeInTheDocument();
  });

  it('error del server al borrar muestra un toast y la fila sigue con su lápiz', async () => {
    stubFetch((_url, options) => {
      if (options?.method === 'DELETE') {
        return jsonResponse(404, { error: 'PAYMENT_METHOD_NOT_FOUND', message: 'gone' });
      }
      return null;
    });
    renderPage();

    await screen.findByText('Débito Santander');
    fireEvent.click(
      section('Santander').getByRole('button', { name: 'Editar Débito Santander' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    fireEvent.click(within(deleteDialog()).getByRole('button', { name: 'Borrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El método de pago no existe o fue borrado.',
    );
    expect(
      section('Santander').getByRole('button', { name: 'Editar Débito Santander' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sin cuentas con las que pagar, muestra el estado vacío', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/accounts')) return jsonResponse(200, [deudas]);
        return jsonResponse(200, []);
      }),
    );
    renderPage();

    expect(await screen.findByText('No hay cuentas todavía.')).toBeInTheDocument();
  });
});
