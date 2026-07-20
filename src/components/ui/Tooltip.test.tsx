import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('el tooltip existe en el DOM y el trigger lo referencia con aria-describedby', () => {
    render(
      <Tooltip text="Explicación de ayuda">
        <span>Informal</span>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button');
    const tip = screen.getByRole('tooltip');
    expect(trigger.getAttribute('aria-describedby')).toBe(tip.id);
    expect(tip).toHaveTextContent('Explicación de ayuda');
  });

  it('tap togglea la visibilidad; Escape lo cierra', () => {
    render(
      <Tooltip text="Explicación de ayuda">
        <span>Informal</span>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button');
    const tip = screen.getByRole('tooltip');

    // arranca oculto (hidden), salvo hover/focus por CSS
    expect(tip).toHaveClass('hidden');
    fireEvent.click(trigger);
    expect(tip).toHaveClass('block');
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(tip).toHaveClass('hidden');
  });
});
