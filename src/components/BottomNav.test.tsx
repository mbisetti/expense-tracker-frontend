import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('muestra los 4 links y marca el activo con aria-current', () => {
    render(
      <MemoryRouter initialEntries={['/income']}>
        <BottomNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Transacciones' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ingresos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cuentas' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Ingresos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
