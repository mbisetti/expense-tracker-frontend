import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { DateField } from './DateField';

// Wrapper controlado: el DateField emite ISO por onChange (target.value); acá se guarda en
// estado y se reinyecta como `value`, igual que hacen los consumidores reales.
function Harness({ onIso, initial = '' }: { onIso?: (v: string) => void; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <DateField
      label="Fecha"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onIso?.(e.target.value);
      }}
    />
  );
}

afterEach(() => {
  localStorage.clear();
});

describe('DateField (Sprint 23 D1)', () => {
  it('preferencia AR: enmascara DD/MM/AAAA y emite ISO al completar', () => {
    const onIso = vi.fn();
    render(<Harness onIso={onIso} />);
    const input = screen.getByLabelText('Fecha') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '15032026' } });

    expect(input.value).toBe('15/03/2026');
    expect(onIso).toHaveBeenLastCalledWith('2026-03-15');
  });

  it('preferencia US: enmascara MM/DD/AAAA y emite el mismo ISO', () => {
    localStorage.setItem('dateFormat', 'us');
    const onIso = vi.fn();
    render(<Harness onIso={onIso} />);
    const input = screen.getByLabelText('Fecha') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '03152026' } });

    expect(input.value).toBe('03/15/2026');
    expect(onIso).toHaveBeenLastCalledWith('2026-03-15');
  });

  it('prefill: un value ISO se muestra en el formato preferido', () => {
    render(<Harness initial="2026-12-05" />);
    expect((screen.getByLabelText('Fecha') as HTMLInputElement).value).toBe('05/12/2026');
  });

  it('fecha imposible (32/03): marca error al toque y emite ""', () => {
    const onIso = vi.fn();
    render(<Harness onIso={onIso} initial="2026-03-15" />);
    const input = screen.getByLabelText('Fecha') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '32032026' } });

    expect(onIso).toHaveBeenLastCalledWith('');
    expect(screen.getByRole('alert')).toHaveTextContent('Fecha inválida');
  });

  it('incompleta: emite "" y muestra el error recién al salir del campo (blur)', () => {
    const onIso = vi.fn();
    render(<Harness onIso={onIso} initial="2026-03-15" />);
    const input = screen.getByLabelText('Fecha') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '1503' } });
    expect(onIso).toHaveBeenLastCalledWith('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('el picker nativo sincroniza el texto y emite ISO', () => {
    const onIso = vi.fn();
    const { container } = render(<Harness onIso={onIso} />);
    const picker = container.querySelector('input[type="date"]') as HTMLInputElement;

    fireEvent.change(picker, { target: { value: '2026-05-20' } });

    expect(onIso).toHaveBeenLastCalledWith('2026-05-20');
    expect((screen.getByLabelText('Fecha') as HTMLInputElement).value).toBe('20/05/2026');
  });

  it('los dígitos van con la voz de los montos (font-semibold tabular-nums, D10)', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Fecha') as HTMLInputElement;
    expect(input.className).toContain('font-semibold');
    expect(input.className).toContain('tabular-nums');
  });
});
