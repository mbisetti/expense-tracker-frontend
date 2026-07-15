import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('aplica las clases de variant y size', () => {
    render(
      <Button variant="danger" size="lg">
        Borrar
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Borrar' });
    expect(button.className).toContain('bg-expense');
    expect(button.className).toContain('h-14');
  });

  it('primary usa el token de marca y secondary el borde neutro', () => {
    const { rerender } = render(<Button variant="primary">Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' }).className).toContain('bg-brand');

    rerender(<Button variant="secondary">Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' }).className).toContain('border-line');
  });

  it('loading deshabilita el botón y muestra el spinner', () => {
    render(<Button loading>Guardando</Button>);
    const button = screen.getByRole('button', { name: 'Guardando' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('disabled deshabilita el botón sin loading', () => {
    render(<Button disabled>No disponible</Button>);
    expect(screen.getByRole('button', { name: 'No disponible' })).toBeDisabled();
  });

  it('dispara onClick al hacer click cuando está habilitado', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Confirmar</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('no dispara onClick cuando está en loading', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} loading>
        Confirmar
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
