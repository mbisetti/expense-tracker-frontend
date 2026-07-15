import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renderiza title y message cuando open', () => {
    render(
      <ConfirmDialog
        open
        title="Borrar cuenta"
        message="Esta acción no se puede deshacer."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Borrar cuenta' })).toBeInTheDocument();
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
  });

  it('no renderiza nada cuando open=false', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Borrar cuenta"
        message="Esta acción no se puede deshacer."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirmar dispara onConfirm', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Borrar cuenta"
        message="Esta acción no se puede deshacer."
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancelar dispara onCancel', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Borrar cuenta"
        message="Esta acción no se puede deshacer."
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Esc cierra (dispara onCancel)', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Borrar cuenta"
        message="Esta acción no se puede deshacer."
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('danger usa el token expense en el botón de confirmar', () => {
    render(
      <ConfirmDialog
        open
        danger
        title="Borrar cuenta"
        message="Esta acción no se puede deshacer."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Confirmar' }).className).toContain('bg-expense');
  });

  it('sin danger usa el token de marca en el botón de confirmar', () => {
    render(
      <ConfirmDialog
        open
        title="Archivar cuenta"
        message="Podés reactivarla después."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Confirmar' }).className).toContain('bg-brand');
  });
});
