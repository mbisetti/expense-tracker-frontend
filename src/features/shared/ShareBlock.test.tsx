import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ShareBlock } from './ShareBlock';
import { jsonResponse } from '../../test/mockResponse';
import { selectOption } from '../../test/selectOption';
import type { Person, ShareMode, ShareRow } from './api';

const people: Person[] = [
  { id: 'p1', name: 'Juan', createdAt: '2026-07-01T00:00:00' },
  { id: 'p2', name: 'Pedro', createdAt: '2026-07-01T00:00:00' },
];

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/people')) return jsonResponse(200, people);
      return jsonResponse(200, []);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

// Host mínimo: el bloque es controlado, así que el test necesita el estado del padre real para
// que agregar gente y cambiar de modo se comporten como en el form.
function Host({ initialRows = [], total = 30000 }: { initialRows?: ShareRow[]; total?: number }) {
  const [enabled, setEnabled] = useState(true);
  const [rows, setRows] = useState<ShareRow[]>(initialRows);
  const [mode, setMode] = useState<ShareMode>('even');

  return (
    <ShareBlock
      enabled={enabled}
      onEnabledChange={setEnabled}
      rows={rows}
      onRowsChange={setRows}
      mode={mode}
      onModeChange={setMode}
      total={total}
      currency="ARS"
    />
  );
}

function renderBlock(props?: { initialRows?: ShareRow[]; total?: number }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <Host {...props} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ShareBlock', () => {
  it('divide en partes iguales incluyéndote y muestra tu parte', async () => {
    renderBlock({ initialRows: [{ personId: 'p1', amount: '' }, { personId: 'p2', amount: '' }] });

    // 30.000 entre vos + 2 → 10.000 cada uno.
    const juan = (await screen.findByLabelText('Juan')) as HTMLInputElement;
    expect(juan.value).toBe('10.000');
    expect(juan).toBeDisabled(); // en partes iguales los montos no se tipean

    expect(screen.getByText('Te corresponde')).toBeInTheDocument();
    expect(screen.getAllByText(/10\.000/).length).toBeGreaterThan(0);
  });

  it('el total manda: cambiarlo recalcula el reparto sin tocar nada más', async () => {
    renderBlock({
      initialRows: [{ personId: 'p1', amount: '' }],
      total: 500,
    });

    const juan = (await screen.findByLabelText('Juan')) as HTMLInputElement;
    expect(juan.value).toBe('250'); // 500 ÷ 2
  });

  it('pasar a montos por persona congela lo que se venía viendo y lo deja editable', async () => {
    renderBlock({ initialRows: [{ personId: 'p1', amount: '' }, { personId: 'p2', amount: '' }] });

    fireEvent.click(await screen.findByRole('button', { name: 'Montos por persona' }));

    const juan = screen.getByLabelText('Juan') as HTMLInputElement;
    expect(juan).toBeEnabled();
    expect(juan.value).toBe('10.000'); // arranca del reparto equitativo, no vacío

    fireEvent.change(juan, { target: { value: '5000' } });
    expect((screen.getByLabelText('Juan') as HTMLInputElement).value).toBe('5.000');
  });

  it('avisa cuando el reparto se pasa del total', async () => {
    renderBlock({ initialRows: [{ personId: 'p1', amount: '' }], total: 1000 });

    fireEvent.click(await screen.findByRole('button', { name: 'Montos por persona' }));
    fireEvent.change(screen.getByLabelText('Juan'), { target: { value: '2000' } });

    expect(screen.getByRole('alert')).toHaveTextContent(/supera el total/i);
  });

  it('sacar a alguien lo quita del reparto', async () => {
    renderBlock({ initialRows: [{ personId: 'p1', amount: '' }, { personId: 'p2', amount: '' }] });

    fireEvent.click(await screen.findByRole('button', { name: 'Sacar a Juan' }));

    expect(screen.queryByLabelText('Juan')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Pedro')).toBeInTheDocument();
  });

  it('agrega una persona existente desde el selector', async () => {
    renderBlock();

    // El Select del design system es un listbox custom (S24.2), no un <select> nativo.
    await selectOption('Con quién', 'p1');

    expect(await screen.findByLabelText('Juan')).toBeInTheDocument();
  });
});
