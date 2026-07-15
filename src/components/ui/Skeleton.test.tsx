import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('variant=text renderiza role=status con aria-label Cargando…', () => {
    render(<Skeleton variant="text" />);
    expect(screen.getByRole('status', { name: 'Cargando…' })).toBeInTheDocument();
  });

  it('variant=list renderiza N filas (rows)', () => {
    const { container } = render(<Skeleton variant="list" rows={5} />);
    const status = screen.getByRole('status');
    expect(status.children[0].children).toHaveLength(5);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(5);
  });

  it('variant=list usa 3 filas por default', () => {
    render(<Skeleton variant="list" />);
    expect(screen.getByRole('status').children[0].children).toHaveLength(3);
  });

  it('variant=card y variant=chart renderizan un único bloque pulse', () => {
    const { container: cardContainer } = render(<Skeleton variant="card" />);
    expect(cardContainer.querySelectorAll('.animate-pulse')).toHaveLength(1);

    const { container: chartContainer } = render(<Skeleton variant="chart" />);
    expect(chartContainer.querySelectorAll('.animate-pulse')).toHaveLength(1);
  });

  it('respeta prefers-reduced-motion (motion-reduce:animate-none)', () => {
    const { container } = render(<Skeleton variant="text" />);
    expect(container.querySelector('.animate-pulse')?.className).toContain(
      'motion-reduce:animate-none',
    );
  });
});
