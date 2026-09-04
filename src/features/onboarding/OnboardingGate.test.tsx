import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { OnboardingGate } from './OnboardingGate';

const useMeMock = vi.fn();
vi.mock('../auth/useMe', () => ({ useMe: () => useMeMock() }));

/**
 * Fix del 2 Sep — la guía tenía UNA sola puerta de entrada, el CTA del dashboard.
 *
 * El caso real: al cerrar sesión desde Gastos, el guard anota de dónde venías, y en el alta ese
 * destino le ganaba a la guía. La cuenta nueva aterrizaba en Gastos, veía todo vacío, y no había
 * ningún camino hacia la guía salvo navegar hasta el dashboard de casualidad.
 *
 * El tercer test es el que más importa y el menos obvio: mientras el perfil está cargando NO se
 * decide nada. Con datos a medias, "todavía no sé" y "no la hizo" se ven igual, y mandar a la guía
 * a alguien que ya la completó es peor que mostrarle su pantalla un instante después.
 */
describe('OnboardingGate', () => {
  beforeEach(() => {
    useMeMock.mockReset();
  });

  function renderAt(path: string) {
    const router = createMemoryRouter(
      [
        { path: '/onboarding', element: <h1>Guía</h1> },
        {
          element: <OnboardingGate />,
          children: [{ path: '/expenses', element: <h1>Gastos</h1> }],
        },
      ],
      { initialEntries: [path] },
    );
    render(<RouterProvider router={router} />);
  }

  it('con la guía pendiente, cualquier pantalla privada lleva a la guía', () => {
    useMeMock.mockReturnValue({ data: { onboarded: false } });

    renderAt('/expenses');

    expect(screen.getByRole('heading', { name: 'Guía' })).toBeInTheDocument();
  });

  it('con la guía hecha, no se mete en el camino', () => {
    useMeMock.mockReturnValue({ data: { onboarded: true } });

    renderAt('/expenses');

    expect(screen.getByRole('heading', { name: 'Gastos' })).toBeInTheDocument();
  });

  it('mientras el perfil carga no redirige a nadie', () => {
    useMeMock.mockReturnValue({ data: undefined });

    renderAt('/expenses');

    expect(screen.getByRole('heading', { name: 'Gastos' })).toBeInTheDocument();
  });
});
