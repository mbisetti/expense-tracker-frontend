import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Switch } from './Switch';

describe('Switch', () => {
  it('render con role=switch, aria-checked y label asociado', () => {
    render(<Switch label="Esencial" checked={false} onChange={() => {}} />);
    const sw = screen.getByRole('switch', { name: 'Esencial' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('click togglea (llama onChange con el valor opuesto)', () => {
    const onChange = vi.fn();
    render(<Switch ariaLabel="Esencial" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Esencial' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('refleja checked=true en aria-checked', () => {
    render(<Switch ariaLabel="X" checked onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('disabled: no dispara onChange', () => {
    const onChange = vi.fn();
    render(<Switch ariaLabel="X" checked={false} onChange={onChange} disabled />);
    const sw = screen.getByRole('switch');
    expect(sw).toBeDisabled();
    fireEvent.click(sw);
    expect(onChange).not.toHaveBeenCalled();
  });
});
