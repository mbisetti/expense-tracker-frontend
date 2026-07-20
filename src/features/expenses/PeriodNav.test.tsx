import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PeriodNav } from './PeriodNav';

describe('PeriodNav', () => {
  it('muestra el label es-AR capitalizado', () => {
    render(<PeriodNav year={2026} month={7} onPrev={() => {}} onNext={() => {}} canGoNext />);
    // es-AR con month:long + year:numeric → "julio de 2026", capitalizado (spec D5).
    expect(screen.getByText('Julio de 2026')).toBeInTheDocument();
  });

  it('las flechas navegan', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<PeriodNav year={2026} month={7} onPrev={onPrev} onNext={onNext} canGoNext />);
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
  });

  it('la flecha adelante se deshabilita en el mes corriente (canGoNext=false)', () => {
    render(<PeriodNav year={2026} month={7} onPrev={() => {}} onNext={() => {}} canGoNext={false} />);
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mes anterior' })).not.toBeDisabled();
  });
});
