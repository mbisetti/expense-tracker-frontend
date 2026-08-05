import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoanProgressCard } from './LoanProgressCard';
import type { LoanProgress } from './api';

const base: LoanProgress = {
  installmentAmount: 85000,
  installmentsTotal: 12,
  dueDay: 10,
  startedOn: '2026-01-10',
  principal: null,
  totalAmount: 1020000,
  paidAmount: 170000,
  paidInstallments: 2,
  nextDueDate: '2026-03-10',
  completed: false,
  cost: null,
  costPct: null,
};

describe('LoanProgressCard (S40 D5)', () => {
  it('muestra cuánto va pagado, por qué cuota va y cuándo vence la próxima', () => {
    render(<LoanProgressCard loan={base} currency="ARS" />);

    expect(screen.getByText('Cuota 3 de 12')).toBeInTheDocument();
    expect(screen.getByText(/170\.000/)).toBeInTheDocument();
    expect(screen.getByText(/1\.020\.000/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '17');
  });

  it('sin capital cargado NO inventa el costo del préstamo', () => {
    render(<LoanProgressCard loan={base} currency="ARS" />);
    expect(screen.queryByText(/más \(\+/)).not.toBeInTheDocument();
  });

  it('con capital cargado muestra cuánto te cuesta, en plata y en %', () => {
    const { container } = render(
      <LoanProgressCard
        loan={{ ...base, principal: 800000, cost: 220000, costPct: 27.5 }}
        currency="ARS"
      />,
    );

    // El copy va partido en varios nodos (montos con <span> propio): se mira el texto completo.
    expect(container.textContent).toContain('220.000,00 más (+27.5%)');
    expect(container.textContent).toContain('Te prestaron');
  });

  it('completado: sin próxima cuota y con la barra llena', () => {
    render(
      <LoanProgressCard
        loan={{
          ...base,
          paidAmount: 1020000,
          paidInstallments: 12,
          nextDueDate: null,
          completed: true,
        }}
        currency="ARS"
      />,
    );

    expect(screen.getByText('¡Terminado!')).toBeInTheDocument();
    expect(screen.queryByText(/Próxima cuota/)).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('pagar de más clampea la barra pero el texto muestra la plata REAL', () => {
    render(
      <LoanProgressCard
        loan={{ ...base, paidAmount: 1100000, paidInstallments: 12, completed: true, nextDueDate: null }}
        currency="ARS"
      />,
    );

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText(/1\.100\.000/)).toBeInTheDocument();
  });
});
