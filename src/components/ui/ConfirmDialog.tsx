import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Confirmación destructiva (borrar): botón de confirmar usa variant="danger". */
  danger?: boolean;
  loading?: boolean;
  /**
   * Contenido extra debajo del mensaje. Existe para las confirmaciones que además piden algo
   * —la reautenticación de S7 antes de borrar la cuenta— sin duplicar el diálogo entero.
   */
  children?: ReactNode;
  /** Deshabilita el botón de confirmar (ej: falta completar lo de `children`). */
  confirmDisabled?: boolean;
};

// Reemplaza los "¿Borrar? Sí/No" inline de Accounts/Categories/PaymentMethods/Transactions
// (§5 design-principles.md) — una sola confirmación destructiva en toda la app.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
  children,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      disableClose={loading}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
      {children}
    </Modal>
  );
}
