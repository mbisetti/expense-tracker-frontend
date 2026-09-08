import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { OrganizeCategoriesModal } from './OrganizeCategoriesModal';
import { circularDistance, hexToHsl } from './categoryColors';
import { jsonResponse, ok } from '../../test/mockResponse';
import type { Category } from './api';

function cat(id: string, name: string, type: Category['type'], color: string | null): Category {
  return {
    id,
    userId: 'u',
    name,
    type,
    color,
    icon: null,
    isEssential: false,
    sourceDefaultCategoryId: null,
    createdAt: '2026-07-01T00:00:00',
  };
}

// Orden del server: Bravo antes que Alpha a propósito (A-Z tiene algo que hacer).
const categories = [
  cat('b', 'Bravo', 'EXPENSE', '#00ff00'),
  cat('a', 'Alpha', 'EXPENSE', '#ff0000'),
  cat('s', 'Salario', 'INCOME', '#0000ff'),
  cat('o', 'Otros', 'BOTH', '#adb5bd'),
];

type Call = { url: string; method?: string; body?: Record<string, unknown> };

function stubFetch(handler?: (call: Call) => Promise<Response> | undefined) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      const call: Call = {
        url,
        method: options?.method,
        body: options?.body ? JSON.parse(options.body as string) : undefined,
      };
      calls.push(call);
      return handler?.(call) ?? ok({});
    }),
  );
  return calls;
}

function renderModal(list: Category[] = categories) {
  const onClose = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <OrganizeCategoriesModal open categories={list} onClose={onClose} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return onClose;
}

const rowNames = () =>
  screen.getAllByRole('listitem').map((li) => within(li).getByRole('button').getAttribute('aria-label'));

const hueOf = (hex: string) => hexToHsl(hex)!.h;

afterEach(() => vi.unstubAllGlobals());

describe('OrganizeCategoriesModal', () => {
  it('lista la sección elegida en el orden recibido y cambia de sección con las pestañas', () => {
    stubFetch();
    renderModal();

    expect(screen.getByRole('dialog', { name: 'Organizar categorías' })).toBeInTheDocument();
    expect(rowNames()).toEqual(['Mover Bravo', 'Mover Alpha']);

    fireEvent.click(screen.getByRole('tab', { name: 'Ingreso' }));
    expect(rowNames()).toEqual(['Mover Salario']);

    fireEvent.click(screen.getByRole('tab', { name: 'Ambos' }));
    expect(rowNames()).toEqual(['Mover Otros']);
    // Guardar arranca deshabilitado: no cambió nada.
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('"Ordenar A-Z" reordena localmente y no llama a la API', () => {
    const calls = stubFetch();
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Ordenar A-Z' }));

    expect(rowNames()).toEqual(['Mover Alpha', 'Mover Bravo']);
    expect(calls).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('mover con las flechas + Guardar hace UN PUT con la permutación completa', async () => {
    const calls = stubFetch();
    const onClose = renderModal();

    // Bravo baja: [Alpha, Bravo]
    fireEvent.keyDown(screen.getByRole('button', { name: 'Mover Bravo' }), { key: 'ArrowDown' });
    expect(rowNames()).toEqual(['Mover Alpha', 'Mover Bravo']);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const puts = calls.filter((c) => c.method === 'PUT');
    expect(puts).toHaveLength(1);
    expect(puts[0].url).toContain('/categories/order');
    // EXPENSE + INCOME + BOTH, cada sección en su orden local.
    expect(puts[0].body).toEqual({ categoryIds: ['a', 'b', 's', 'o'] });
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);
    expect(await screen.findByRole('status')).toHaveTextContent('Categorías organizadas.');
  });

  it('"Reasignar colores" cambia los swatches sin request; Guardar manda un PATCH por cada una que cambió', async () => {
    const calls = stubFetch();
    const onClose = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Reasignar colores' }));

    expect(calls).toHaveLength(0);
    expect(screen.queryByLabelText('Color #ff0000')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Color #00ff00')).not.toBeInTheDocument();
    // Después de la primera reasignación el botón ofrece mezclar de nuevo.
    expect(screen.getByRole('button', { name: 'Mezclar de nuevo' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const patches = calls.filter((c) => c.method === 'PATCH');
    expect(patches.map((p) => p.url.split('/').pop()).sort()).toEqual(['a', 'b']);
    for (const p of patches) {
      expect(p.body).toEqual({ color: expect.stringMatching(/^#[0-9a-f]{6}$/) });
    }
    // El orden no cambió: ningún PUT.
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
  });

  it('reasignar Gasto y después Ambos: Ambos esquiva los colores NUEVOS de Gasto', () => {
    stubFetch();
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Reasignar colores' }));
    const gastoHexes = screen
      .getAllByRole('listitem')
      .map((li) => within(li).getByLabelText(/^Color /).getAttribute('aria-label')!.replace('Color ', ''));
    expect(gastoHexes).toHaveLength(2);

    fireEvent.click(screen.getByRole('tab', { name: 'Ambos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reasignar colores' }));
    const otrosHex = screen.getByLabelText(/^Color /).getAttribute('aria-label')!.replace('Color ', '');

    // Fijos para Ambos: los dos de Gasto (nuevos) y Salario (240°). Tres puntos en la rueda
    // dejan un hueco de al menos 120°, y el centro queda a 60° o más de sus dos vecinos.
    for (const fixed of [...gastoHexes, '#0000ff']) {
      expect(circularDistance(hueOf(otrosHex), hueOf(fixed))).toBeGreaterThan(55);
    }
  });

  it('Cancelar no manda nada', () => {
    const calls = stubFetch();
    const onClose = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Ordenar A-Z' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reasignar colores' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it('un PATCH que falla deja el modal abierto y muestra el toast', async () => {
    stubFetch((call) =>
      call.method === 'PATCH'
        ? jsonResponse(500, { error: 'INTERNAL', message: 'boom' })
        : undefined,
    );
    const onClose = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Reasignar colores' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal');
    expect(screen.getByRole('dialog', { name: 'Organizar categorías' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // Sigue habiendo cambios sin guardar: se puede reintentar.
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('una sección vacía muestra el EmptyState y deja los botones apagados', () => {
    stubFetch();
    renderModal(categories.filter((c) => c.type !== 'INCOME'));

    fireEvent.click(screen.getByRole('tab', { name: 'Ingreso' }));

    expect(screen.getByText('No hay categorías de este tipo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ordenar A-Z' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reasignar colores' })).toBeDisabled();
  });
});
