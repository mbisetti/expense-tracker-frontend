import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Modal } from './Modal';
import { runBackInterceptors } from '../../lib/nativeBack';

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

// S44 — botón físico "atrás" de Android. El modal se registra en la pila de `nativeBack`
// mientras está abierto; acá se simula el back corriendo la pila a mano, que es exactamente
// lo que hace el listener nativo de `nativeBootstrap`.
describe('Modal · botón atrás de Android', () => {
  it('con el modal abierto, el back lo cierra y NO sale de la app', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Título del modal">
        contenido
      </Modal>,
    );

    // true = consumido: el bootstrap no toca el historial ni llama a exitApp().
    expect(runBackInterceptors()).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('cerrado no se mete en el camino del back', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Título del modal">
        contenido
      </Modal>,
    );

    expect(runBackInterceptors()).toBe(false);
  });

  it('con disableClose consume el back pero no cierra: nadie sale de la app en medio de un POST de plata', () => {
    const onClose = vi.fn();
    render(
      <Modal open disableClose onClose={onClose} title="Título del modal">
        contenido
      </Modal>,
    );

    expect(runBackInterceptors()).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('al desmontarse se da de baja de la pila', () => {
    const { unmount } = render(
      <Modal open onClose={vi.fn()} title="Título del modal">
        contenido
      </Modal>,
    );

    unmount();

    expect(runBackInterceptors()).toBe(false);
  });

  it('el de más arriba gana: con dos modales abiertos, el back cierra el último', () => {
    const cerrarFondo = vi.fn();
    const cerrarArriba = vi.fn();
    render(
      <>
        <Modal open onClose={cerrarFondo} title="El de abajo">
          fondo
        </Modal>
        <Modal open onClose={cerrarArriba} title="El de arriba">
          arriba
        </Modal>
      </>,
    );

    runBackInterceptors();

    expect(cerrarArriba).toHaveBeenCalledOnce();
    expect(cerrarFondo).not.toHaveBeenCalled();
  });
});
