import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Toast } from './Toast';
import { ToastProvider } from './ToastProvider';
import { useToast } from './toastContext';

function TriggerButtons() {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast.success('Guardado con éxito')}>
        disparar success
      </button>
      <button type="button" onClick={() => toast.error('Algo salió mal')}>
        disparar error
      </button>
    </>
  );
}

describe('Toast', () => {
  it('success renderiza con role=status y aria-live=polite', () => {
    render(<Toast variant="success" message="Guardado" onDismiss={() => {}} />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Guardado')).toBeInTheDocument();
  });

  it('error renderiza con role=alert', () => {
    render(<Toast variant="error" message="Error de servidor" onDismiss={() => {}} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Error de servidor')).toBeInTheDocument();
  });

  it('dismiss manual dispara onDismiss', () => {
    const onDismiss = vi.fn();
    render(<Toast variant="success" message="Guardado" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  describe('auto-dismiss', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('se auto-descarta a los ~4s', () => {
      const onDismiss = vi.fn();
      render(<Toast variant="success" message="Guardado" onDismiss={onDismiss} />);
      expect(onDismiss).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('ToastProvider / useToast', () => {
    it('success() apila un toast con role=status', () => {
      render(
        <ToastProvider>
          <TriggerButtons />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'disparar success' }));
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Guardado con éxito')).toBeInTheDocument();
    });

    it('error() apila un toast con role=alert', () => {
      render(
        <ToastProvider>
          <TriggerButtons />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'disparar error' }));
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    });

    it('useToast fuera de ToastProvider tira error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<TriggerButtons />)).toThrow(
        'useToast debe usarse dentro de <ToastProvider>',
      );
      spy.mockRestore();
    });
  });
});
