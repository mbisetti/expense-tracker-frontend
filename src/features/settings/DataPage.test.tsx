import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DataPage } from './DataPage';

describe('DataPage', () => {
  it('muestra accesos a categorías y métodos de pago', () => {
    render(
      <MemoryRouter>
        <DataPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Datos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categorías' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('link', { name: 'Métodos de pago' })).toHaveAttribute(
      'href',
      '/payment-methods',
    );
  });
});
