import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { CategoryForm } from './CategoryForm';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';
import { selectOption } from '../../test/selectOption';
import { circularDistance, hexToHsl } from './categoryColors';
import type { Category } from './api';

const editCat: Category = {
  id: 'cat-1',
  userId: 'u',
  name: 'Ocio',
  type: 'EXPENSE',
  color: '#aa3bff',
  icon: null,
  isEssential: false,
  sourceDefaultCategoryId: null,
  createdAt: '2026-07-01T00:00:00',
};

// S48: lo que ya existe, para que el alta proponga un color que no choque. Un gasto violeta
// (277°), una de ambos verde (120°) y un ingreso rojo (0°): cada conjunto graficado deja su
// hueco más grande en un lugar distinto, así la propuesta es determinista y distinta por tipo.
const bothCat: Category = { ...editCat, id: 'cat-2', name: 'Otros', type: 'BOTH', color: '#00ff00' };
const incomeCat: Category = { ...editCat, id: 'cat-3', name: 'Salario', type: 'INCOME', color: '#ff0000' };
// Gasto: fijos 120° y 277° → el hueco grande cruza el 360 y su centro es 18,5°.
const EXPECTED_EXPENSE_HUE = 18.5;
// Ingreso: fijos 0° y 120° → centro 240°.
const EXPECTED_INCOME_HUE = 240;

let calls: { url: string; method?: string; body?: Record<string, unknown> }[];

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      calls.push({
        url,
        method: options?.method,
        body: options?.body ? JSON.parse(options.body as string) : undefined,
      });
      // El GET es la lista (el form la lee para proponer color); POST/PATCH devuelven una.
      if (!options?.method || options.method === 'GET') {
        return jsonResponse(200, [editCat, bothCat, incomeCat]);
      }
      return jsonResponse(options.method === 'POST' ? 201 : 200, { ...editCat });
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

function renderForm(category?: Category) {
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
          <CategoryForm category={category} onClose={onClose} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return onClose;
}

const colorInput = () => screen.getByLabelText('Color') as HTMLInputElement;
const hueOf = (hex: string) => hexToHsl(hex)!.h;

// Hasta que la lista carga, la propuesta es "sin fijos" (al azar): se espera a la determinista.
async function waitForProposal(hue: number) {
  await waitFor(() => {
    expect(circularDistance(hueOf(colorInput().value), hue)).toBeLessThan(3);
  });
}

describe('CategoryForm — esencialidad (Sprint 24)', () => {
  it('el switch "Esencial" se muestra en gasto y se oculta en INCOME', async () => {
    renderForm();
    expect(screen.getByRole('switch', { name: 'Esencial' })).toBeInTheDocument();

    await selectOption('Tipo', 'INCOME');
    expect(screen.queryByRole('switch', { name: 'Esencial' })).not.toBeInTheDocument();
  });

  it('en edición, el flag entra al PATCH solo si cambió', async () => {
    const onClose = renderForm(editCat);
    fireEvent.click(screen.getByRole('switch', { name: 'Esencial' })); // false → true
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect(patch.url).toContain('/categories/cat-1');
    expect(patch.body).toEqual({ isEssential: true });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('en edición sin tocar el switch, el PATCH no incluye isEssential', async () => {
    const onClose = renderForm(editCat);
    // cambia solo el nombre (label required lleva asterisco → exact:false)
    fireEvent.change(screen.getByLabelText('Nombre', { exact: false }), {
      target: { value: 'Ocio y salidas' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect(patch.body).toEqual({ name: 'Ocio y salidas' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('CategoryForm — color propuesto en el alta (S48, D5)', () => {
  it('propone un color en el hueco que dejan las que se grafican con el tipo, y lo manda en el POST', async () => {
    const onClose = renderForm();
    await waitForProposal(EXPECTED_EXPENSE_HUE);
    const proposed = colorInput().value;
    expect(proposed).toMatch(/^#[0-9a-f]{6}$/);

    fireEvent.change(screen.getByLabelText('Nombre', { exact: false }), {
      target: { value: 'Mascotas' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    const post = calls.find((c) => c.method === 'POST')!;
    expect(post.body).toMatchObject({ name: 'Mascotas', type: 'EXPENSE', color: proposed });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('cambiar el tipo antes de tocar el picker vuelve a proponer; tocarlo lo fija', async () => {
    renderForm();
    await waitForProposal(EXPECTED_EXPENSE_HUE);

    // Ingreso se grafica con Ambos: otros fijos, otro hueco, otro color.
    await selectOption('Tipo', 'INCOME');
    expect(circularDistance(hueOf(colorInput().value), EXPECTED_INCOME_HUE)).toBeLessThan(3);

    // Tocar el picker lo fija: el tipo deja de influir.
    fireEvent.change(colorInput(), { target: { value: '#123456' } });
    await selectOption('Tipo', 'EXPENSE');
    expect(colorInput().value).toBe('#123456');
  });

  it('en edición, el color guardado manda y no entra al PATCH si no se tocó', async () => {
    const onClose = renderForm(editCat);
    expect(colorInput().value).toBe('#aa3bff');
    fireEvent.change(screen.getByLabelText('Nombre', { exact: false }), {
      target: { value: 'Ocio y salidas' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ name: 'Ocio y salidas' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
