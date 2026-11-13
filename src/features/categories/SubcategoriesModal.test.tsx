import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { SubcategoriesModal } from './SubcategoriesModal';
import { jsonResponse } from '../../test/mockResponse';

type Sub = { id: string; name: string };

let subs: Sub[];
let calls: { method: string; url: string; body?: unknown }[];

const categories = () => [
  {
    id: 'cat-bol',
    userId: 'user-1',
    name: 'Boliche',
    type: 'EXPENSE',
    color: '#aa3bff',
    icon: null,
    isEssential: false,
    sourceDefaultCategoryId: null,
    createdAt: '2026-07-01T00:00:00',
    subcategories: subs,
  },
];

beforeEach(() => {
  subs = [
    { id: 'sub-en', name: 'Entrada' },
    { id: 'sub-tr', name: 'Transporte' },
  ];
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      const method = options?.method ?? 'GET';
      const body = options?.body ? JSON.parse(options.body as string) : undefined;
      if (method !== 'GET') calls.push({ method, url, body });
      if (method === 'POST') {
        const created = { id: `sub-${subs.length + 1}`, name: body.name };
        subs = [...subs, created];
        return jsonResponse(201, created);
      }
      if (method === 'PATCH') {
        subs = subs.map((s) => (url.endsWith(s.id) ? { ...s, name: body.name } : s));
        return jsonResponse(200, { id: url.split('/').pop(), name: body.name });
      }
      if (method === 'DELETE') {
        subs = subs.filter((s) => !url.endsWith(s.id));
        return jsonResponse(204, null);
      }
      if (method === 'PUT') {
        const ids: string[] = body.subcategoryIds;
        subs = ids.map((id) => subs.find((s) => s.id === id)!);
        return jsonResponse(204, null);
      }
      return jsonResponse(200, categories());
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <SubcategoriesModal open categoryId="cat-bol" onClose={onClose} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return onClose;
}

describe('SubcategoriesModal (S51)', () => {
  it('lista las subcategorías en el orden recibido, con el título de la categoría', async () => {
    renderModal();
    expect(await screen.findByRole('dialog', { name: 'Subcategorías de Boliche' })).toBeInTheDocument();
    const handles = await screen.findAllByRole('button', { name: /^Mover / });
    expect(handles.map((h) => h.getAttribute('aria-label'))).toEqual([
      'Mover Entrada',
      'Mover Transporte',
    ]);
  });

  it('Agregar hace el POST, limpia el input y la nueva aparece; Enter también agrega', async () => {
    renderModal();
    await screen.findByText('Entrada');
    const input = screen.getByLabelText('Nueva subcategoría');

    fireEvent.change(input, { target: { value: '  Previa ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({
      method: 'POST',
      body: { name: 'Previa' },
    });
    expect(calls[0].url).toContain('/categories/cat-bol/subcategories');
    expect(await screen.findByText('Previa')).toBeInTheDocument();
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value: 'Consumo' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].body).toEqual({ name: 'Consumo' });
  });

  it('renombrar: el lápiz abre el input, Enter hace el PATCH', async () => {
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Entrada' }));
    const input = screen.getByLabelText('Nombre de Entrada');
    fireEvent.change(input, { target: { value: 'Entradas' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ method: 'PATCH', body: { name: 'Entradas' } });
    expect(calls[0].url).toContain('/subcategories/sub-en');
    expect(await screen.findByText('Entradas')).toBeInTheDocument();
  });

  it('Esc cancela la edición sin mandar nada y sin cerrar el modal', async () => {
    const onClose = renderModal();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Entrada' }));
    const input = screen.getByLabelText('Nombre de Entrada');
    fireEvent.change(input, { target: { value: 'Otra cosa' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByLabelText('Nombre de Entrada')).not.toBeInTheDocument();
    expect(screen.getByText('Entrada')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it('el tacho pide confirmación en el lugar y no borra hasta confirmar; Cancelar la descarta', async () => {
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar Transporte' }));
    expect(
      screen.getByText('¿Borrar Transporte? Sus movimientos quedan en Boliche, sin subcategoría.'),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText(/¿Borrar Transporte\?/)).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Borrar Transporte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].method).toBe('DELETE');
    expect(calls[0].url).toContain('/subcategories/sub-tr');
    await waitFor(() => expect(screen.queryByText('Transporte')).not.toBeInTheDocument());
  });

  it('mover con las flechas hace UN PUT con la permutación completa', async () => {
    renderModal();
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Mover Entrada' }), {
      key: 'ArrowDown',
    });

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({
      method: 'PUT',
      body: { subcategoryIds: ['sub-tr', 'sub-en'] },
    });
    expect(calls[0].url).toContain('/subcategories/order');
  });

  it('con 20 el input se deshabilita y lo dice', async () => {
    subs = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, name: `S${i}` }));
    renderModal();
    await screen.findByText('S0');
    expect(screen.getByLabelText('Nueva subcategoría')).toBeDisabled();
    expect(screen.getByText('Llegaste al máximo de 20.')).toBeInTheDocument();
  });

  it('sin subcategorías explica para qué sirven', async () => {
    subs = [];
    renderModal();
    expect(await screen.findByText(/Todavía no tiene subcategorías/)).toBeInTheDocument();
  });

  it('un nombre repetido muestra el error del server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) =>
        options?.method === 'POST'
          ? jsonResponse(409, { error: 'SUBCATEGORY_NAME_TAKEN', message: 'taken' })
          : jsonResponse(200, categories()),
      ),
    );
    renderModal();
    await screen.findByText('Entrada');
    fireEvent.change(screen.getByLabelText('Nueva subcategoría'), { target: { value: 'entrada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya hay una subcategoría con ese nombre.');
  });

  it('Listo cierra', async () => {
    const onClose = renderModal();
    fireEvent.click(await screen.findByRole('button', { name: 'Listo' }));
    expect(onClose).toHaveBeenCalled();
  });
});
