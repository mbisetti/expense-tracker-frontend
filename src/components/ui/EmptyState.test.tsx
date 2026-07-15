import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renderiza title y, si viene, message', () => {
    render(<EmptyState title="No hay transacciones" message="Registrá tu primer gasto." />);
    expect(screen.getByText('No hay transacciones')).toBeInTheDocument();
    expect(screen.getByText('Registrá tu primer gasto.')).toBeInTheDocument();
  });

  it('sin message no renderiza el párrafo', () => {
    const { container } = render(<EmptyState title="No hay transacciones" />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('con actionLabel y onAction renderiza el CTA y dispara el callback', () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="No hay transacciones"
        actionLabel="Agregar transacción"
        onAction={onAction}
      />,
    );
    const button = screen.getByRole('button', { name: 'Agregar transacción' });
    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('sin actionLabel/onAction no renderiza CTA', () => {
    render(<EmptyState title="No hay transacciones" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renderiza una ilustración (svg) por default', () => {
    const { container } = render(<EmptyState title="No hay transacciones" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
