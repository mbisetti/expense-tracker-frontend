import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('clampea ratio > 1 al 100% de ancho pero conserva el % real en aria-valuetext', () => {
    render(<ProgressBar ratio={1.2} tone="expense" label="Presupuesto Comida" />);
    const bar = screen.getByRole('progressbar', { name: 'Presupuesto Comida' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuetext', '120%');
    expect(bar.firstElementChild).toHaveStyle({ width: '100%' });
  });

  it('clampea ratio negativo a 0%', () => {
    render(<ProgressBar ratio={-0.5} tone="income" label="Ahorro" />);
    const bar = screen.getByRole('progressbar', { name: 'Ahorro' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar.firstElementChild).toHaveStyle({ width: '0%' });
  });

  it('ratio normal refleja el ancho y el tono pedido', () => {
    render(<ProgressBar ratio={0.4} tone="warning" label="Presupuesto Transporte" />);
    const bar = screen.getByRole('progressbar', { name: 'Presupuesto Transporte' });
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar.firstElementChild?.className).toContain('bg-warning');
  });

  it('markerRatio ubica la marca en la posición correcta y clampeada', () => {
    const { container } = render(
      <ProgressBar ratio={0.5} tone="brand" label="Con marcador" markerRatio={1.4} />,
    );
    const marker = container.querySelector('[aria-hidden="true"]');
    expect(marker).toHaveStyle({ left: '100%' });
  });

  it('sin markerRatio no renderiza la marca', () => {
    const { container } = render(<ProgressBar ratio={0.5} tone="brand" label="Sin marcador" />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });
});
