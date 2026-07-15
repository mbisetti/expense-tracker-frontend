import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Modal } from './Modal';

// Harness con trigger real: para poder afirmar que el foco vuelve al elemento que abrió
// el modal (no alcanza con `document.activeElement` sin un trigger enfocable de verdad).
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        abrir
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Título del modal">
        <button type="button">acción interna</button>
      </Modal>
    </>
  );
}

function getBackdrop(): HTMLElement {
  const backdrop = document.querySelector('[aria-hidden="true"]');
  if (!backdrop) throw new Error('backdrop no encontrado');
  return backdrop as HTMLElement;
}

describe('Modal', () => {
  it('renderiza role=dialog + aria-modal + aria-labelledby por el title cuando open', () => {
    render(
      <Modal open onClose={() => {}} title="Borrar cuenta">
        <p>contenido</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Borrar cuenta' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('no está en el DOM cuando open=false', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Borrar cuenta">
        <p>contenido</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Esc dispara onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Borrar cuenta">
        <p>contenido</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('click en el backdrop dispara onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Borrar cuenta">
        <p>contenido</p>
      </Modal>,
    );
    fireEvent.click(getBackdrop());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('click en el contenido del dialog NO dispara onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Borrar cuenta">
        <p>contenido</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText('contenido'));
    expect(onClose).not.toHaveBeenCalled();
  });

  describe('disableClose', () => {
    it('Esc no dispara onClose', () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="Borrando…" disableClose>
          <p>contenido</p>
        </Modal>,
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('click en el backdrop no dispara onClose', () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="Borrando…" disableClose>
          <p>contenido</p>
        </Modal>,
      );
      fireEvent.click(getBackdrop());
      expect(onClose).not.toHaveBeenCalled();
    });

    it('el botón X está deshabilitado (visual + no dispara onClose)', () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="Borrando…" disableClose>
          <p>contenido</p>
        </Modal>,
      );
      const closeButton = screen.getByRole('button', { name: 'Cerrar' });
      expect(closeButton).toBeDisabled();
      fireEvent.click(closeButton);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('foco: entra al modal al abrir y vuelve al trigger al cerrar', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'abrir' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    // El primer focusable en orden del DOM es el botón "Cerrar" (X del header), que
    // precede al contenido — no el botón de acción interna.
    const closeButton = screen.getByRole('button', { name: 'Cerrar' });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
  });
});
