import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConsolidatedBanner } from './ConsolidatedBanner';
import type { ConsolidatedBalance } from './api';

const base: ConsolidatedBalance = {
  amount: 1250000,
  currency: 'ARS',
  isEstimate: true,
  partial: false,
  quote: null,
  quoteDate: null,
};

describe('ConsolidatedBanner', () => {
  // S49 (D6): el "≈" deja de ser un número sin origen.
  it('con casa dice con qué dólar y de qué día está calculado', () => {
    render(<ConsolidatedBanner consolidated={{ ...base, quote: 'MEP', quoteDate: '2026-09-09' }} />);

    expect(
      screen.getByText('Al MEP del 9/9. El balance por moneda de abajo es el real.'),
    ).toBeInTheDocument();
  });

  // quote null no es un error: es el par que no pasó por USD/ARS, o la tabla todavía sin datos.
  it('sin casa muestra el copy de siempre', () => {
    render(<ConsolidatedBanner consolidated={base} />);

    expect(
      screen.getByText(
        'Estimación con la cotización actual. El balance por moneda de abajo es el real.',
      ),
    ).toBeInTheDocument();
  });

  it('parcial suma su aclaración sin perder la de la casa', () => {
    render(
      <ConsolidatedBanner
        consolidated={{ ...base, partial: true, quote: 'BLUE', quoteDate: '2026-09-10' }}
      />,
    );

    expect(
      screen.getByText(
        'Al Blue del 10/9. El balance por moneda de abajo es el real. Faltó la cotización de alguna moneda: el total es parcial.',
      ),
    ).toBeInTheDocument();
  });
});
