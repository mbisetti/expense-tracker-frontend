import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Amount } from './Amount';
import { formatMoney } from '../../lib/money';

describe('Amount', () => {
  it('tone=auto con monto positivo usa el color income y signo +', () => {
    const { container } = render(<Amount amount={1500} currency="ARS" />);
    const span = container.querySelector('span')!;
    expect(span.className).toContain('text-income');
    expect(span.textContent).toBe(`+${formatMoney(1500, 'ARS')}`);
  });

  it('tone=auto con monto negativo usa el color expense y signo −', () => {
    const { container } = render(<Amount amount={-1500} currency="ARS" />);
    const span = container.querySelector('span')!;
    expect(span.className).toContain('text-expense');
    expect(span.textContent).toBe(`−${formatMoney(1500, 'ARS')}`);
  });

  it('usa formatMoney (no formatea a mano) y tabular-nums', () => {
    const { container } = render(<Amount amount={99.9} currency="USD" />);
    const span = container.querySelector('span')!;
    expect(span.className).toContain('tabular-nums');
    expect(span.textContent).toContain(formatMoney(99.9, 'USD'));
  });

  it('tone explícito pisa el signo derivado del monto', () => {
    const { container } = render(<Amount amount={500} currency="ARS" tone="expense" />);
    expect(container.querySelector('span')!.className).toContain('text-expense');
  });

  it('tone=neutral no usa income ni expense', () => {
    const { container } = render(<Amount amount={500} currency="ARS" tone="neutral" />);
    const span = container.querySelector('span')!;
    expect(span.className).not.toContain('text-income');
    expect(span.className).not.toContain('text-expense');
  });
});
