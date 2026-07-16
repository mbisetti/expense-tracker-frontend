import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

function renderLanding() {
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  it('renderiza el hero con el wordmark, el value prop y los CTA', () => {
    renderLanding();

    expect(screen.getByRole('heading', { level: 1, name: 'Manguitos' })).toBeInTheDocument();
    expect(
      screen.getByText('Tus finanzas personales, en serio pero humano.'),
    ).toBeInTheDocument();

    const registerLinks = screen.getAllByRole('link', { name: 'Crear cuenta' });
    expect(registerLinks.length).toBeGreaterThan(0);
    registerLinks.forEach((link) => expect(link).toHaveAttribute('href', '/register'));

    const loginLinks = screen.getAllByRole('link', { name: 'Iniciar sesión' });
    expect(loginLinks.length).toBeGreaterThan(0);
    loginLinks.forEach((link) => expect(link).toHaveAttribute('href', '/login'));
  });

  it('renderiza las 4 secciones de features y la sección de confianza', () => {
    renderLanding();

    expect(screen.getByRole('heading', { name: 'Lo que ya podés hacer' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Controlá cada gasto, sin planillas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Presupuestos con proyección a fin de mes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Pesos, dólares, y las transferencias entre medio' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'De bruto a neto, con las deducciones claras' }),
    ).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Honestidad ante todo' })).toBeInTheDocument();
    expect(screen.getByText('Tus datos son tuyos')).toBeInTheDocument();
    expect(screen.getByText('Sin venta de datos')).toBeInTheDocument();
    expect(screen.getByText('Código propio')).toBeInTheDocument();
  });

  it('renderiza el footer con el año actual, sin crashear', () => {
    renderLanding();

    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} Manguitos`)).toBeInTheDocument();
  });
});
