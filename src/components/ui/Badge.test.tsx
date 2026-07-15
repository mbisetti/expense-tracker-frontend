import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, type BadgeStatus } from './Badge';

const CASES: { status: BadgeStatus; label: string; toneClass: string }[] = [
  { status: 'ok', label: 'Al día', toneClass: 'text-income' },
  { status: 'warning', label: 'Cerca del límite', toneClass: 'text-warning' },
  { status: 'exceeded', label: 'Excedido', toneClass: 'text-exceeded' },
  { status: 'pending', label: 'Pendiente', toneClass: 'text-muted' },
  { status: 'info', label: 'Dato', toneClass: 'text-transfer' },
];

describe('Badge', () => {
  it.each(CASES)('status=$status muestra ícono + label (nunca sólo color)', ({
    status,
    label,
    toneClass,
  }) => {
    const { container } = render(<Badge status={status} label={label} />);

    expect(screen.getByText(label)).toBeInTheDocument();
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild?.className).toContain(toneClass);
  });
});
