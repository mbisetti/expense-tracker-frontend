import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { SavingsGoalSection } from './SavingsGoalSection';
import { ok } from '../../test/mockResponse';

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <SavingsGoalSection />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SavingsGoalSection', () => {
  it('muestra nombre, fecha, progreso y montos formateados', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok([
          {
            id: 'g1',
            name: 'Viaje a Bariloche',
            targetAmount: 2000000,
            currentAmount: 300000,
            currency: 'ARS',
            deadline: '2027-12-31',
          },
        ]),
      ),
    );

    renderSection();

    expect(await screen.findByText('Viaje a Bariloche')).toBeInTheDocument();
    const expectedDate = new Date('2027-12-31T00:00:00').toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('15');
    expect(screen.getByText('$ 300.000,00 de $ 2.000.000,00')).toBeInTheDocument();
  });

  it('objetivo completado muestra "Completado" y tone income', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok([
          {
            id: 'g2',
            name: 'Fondo de emergencia',
            targetAmount: 500000,
            currentAmount: 500000,
            currency: 'ARS',
            deadline: null,
          },
        ]),
      ),
    );

    renderSection();

    expect(await screen.findByText('Completado')).toBeInTheDocument();
  });

  it('deadline pasada y sin completar igual muestra la fecha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok([
          {
            id: 'g3',
            name: 'Auto usado',
            targetAmount: 1000000,
            currentAmount: 200000,
            currency: 'ARS',
            deadline: '2020-01-15',
          },
        ]),
      ),
    );

    renderSection();

    const expectedDate = new Date('2020-01-15T00:00:00').toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    expect(await screen.findByText(expectedDate)).toBeInTheDocument();
  });

  it('muestra empty state sin objetivos', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok([])));

    renderSection();

    expect(
      await screen.findByText('Todavía no tenés objetivos de ahorro.'),
    ).toBeInTheDocument();
  });
});
