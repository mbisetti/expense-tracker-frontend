import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { ExpectedIncomeCard } from './ExpectedIncomeCard';
import { IncomeEntryForm } from './IncomeEntryForm';
import { IncomeSourceList } from './IncomeSourceList';
import { IncomeEntryList } from './IncomeEntryList';
import { useDeleteIncomeEntry } from './useIncomeMutations';
import { incomeErrorMessage } from './errorMessages';
import type { IncomeEntryListItem } from './api';

export function IncomePage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  // S36 (FR-7): deep-link del centro de notificaciones. Se lee UNA vez, como el resto de los
  // params de la app (no se sincroniza de vuelta a la URL).
  const [autoConfirmSourceId] = useState(() => searchParams.get('confirm'));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeEntryListItem | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<IncomeEntryListItem | null>(null);
  const deleteMutation = useDeleteIncomeEntry();
  const formRef = useRef<HTMLDivElement>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const startEdit = (entry: IncomeEntryListItem) => {
    setEditing(entry);
    setFormOpen(true);
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!confirmingDelete) return;
    deleteMutation.mutate(confirmingDelete.id, {
      onSuccess: () => {
        toast.success('Ingreso borrado.');
        closeForm();
      },
      onError: (error) => toast.error(incomeErrorMessage(error)),
      onSettled: () => setConfirmingDelete(null),
    });
  };

  return (
    <section className="text-left flex flex-col gap-4">
      <h1>Ingresos</h1>

      {/* S36 (FR-8): la card de esperados va PRIMERO y el alta se colapsa detrás de un botón,
          como en Transacciones. Las fuentes quedan a mano porque son las que se tickean. */}
      <ExpectedIncomeCard autoConfirmSourceId={autoConfirmSourceId} />

      <div ref={formRef} tabIndex={-1}>
        {formOpen ? (
          <IncomeEntryForm
            // Remonta al cambiar de entrada: el form arranca su estado de los props.
            key={editing?.id ?? 'new'}
            editing={editing}
            onClose={closeForm}
            onDelete={(entry) => setConfirmingDelete(entry)}
          />
        ) : (
          // Ancho completo, como las cards: un botón chico suelto en una columna de cards se
          // leía como un elemento fuera de la grilla.
          <Button type="button" className="w-full" onClick={openCreate}>
            Registrar ingreso
          </Button>
        )}
      </div>

      <IncomeSourceList />
      <IncomeEntryList onEdit={startEdit} />

      <ConfirmDialog
        open={confirmingDelete !== null}
        danger
        title="Borrar ingreso"
        message="Se borra el ingreso y su movimiento. Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(null)}
      />
    </section>
  );
}
