import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubBalanceChip } from './SubBalanceChip';
import type { ExchangeRateResult } from '../transfers/api';

// El chip sólo compone un texto con lo que le da el hook: se mockea el hook y se mira el copy,
// que es lo que S49 cambia. La resolución de la casa se prueba en el backend.
const rate = vi.hoisted(() => ({ current: null as ExchangeRateResult | null }));

vi.mock('../transfers/useExchangeRate', () => ({
  useExchangeRate: () => ({ data: rate.current }),
}));

function result(overrides: Partial<ExchangeRateResult>): ExchangeRateResult {
  return {
    base: 'USD',
    target: 'ARS',
    rate: 1500,
    asOf: null,
    unavailable: false,
    quote: null,
    quoteDate: null,
    ...overrides,
  };
}

describe('SubBalanceChip', () => {
  it('con casa, el tooltip dice cuál y de qué día', () => {
    rate.current = result({ quote: 'MEP', quoteDate: '2026-09-09' });

    render(<SubBalanceChip currency="USD" balance={10} favoriteCurrency="ARS" />);

    expect(screen.getByRole('tooltip')).toHaveTextContent('(estimado, MEP del 9/9)');
  });

  it('sin casa, el tooltip de siempre', () => {
    rate.current = result({});

    render(<SubBalanceChip currency="USD" balance={10} favoriteCurrency="ARS" />);

    expect(screen.getByRole('tooltip')).toHaveTextContent('(estimado)');
  });

  it('sin cotización disponible no inventa ninguna casa', () => {
    rate.current = result({ rate: null, unavailable: true });

    render(<SubBalanceChip currency="USD" balance={10} favoriteCurrency="ARS" />);

    expect(screen.getByRole('tooltip')).toHaveTextContent('Cotización no disponible');
  });
});
