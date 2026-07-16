import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from './BottomNav';

describe('BottomNav (v2, tokenizada)', () => {
  it('muestra los 4 links y marca el activo con aria-current y color de marca', () => {
    render(
      <MemoryRouter initialEntries={['/income']}>
        <BottomNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Transacciones' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ingresos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cuentas' })).toBeInTheDocument();

    const activeLink = screen.getByRole('link', { name: 'Ingresos' });
    expect(activeLink).toHaveAttribute('aria-current', 'page');
    expect(activeLink.className).toContain('text-brand');
  });
});
