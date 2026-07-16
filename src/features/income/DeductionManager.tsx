import { useState, type FormEvent } from 'react';
import type { DeductionType } from './api';
import { useIncomeDeductions } from './useIncomeDeductions';
import { useCreateDeduction, useDeleteDeduction, useUpdateDeduction } from './useDeductionMutations';
import { incomeErrorMessage } from './errorMessages';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';

export function DeductionManager({ sourceId }: { sourceId: string }) {
  const toast = useToast();
  const { data: deductions, isPending } = useIncomeDeductions(sourceId);
  const createMutation = useCreateDeduction(sourceId);
  const updateMutation = useUpdateDeduction(sourceId);
  const deleteMutation = useDeleteDeduction(sourceId);

  const [name, setName] = useState('');
  const [type, setType] = useState<DeductionType>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createMutation.mutate(
      { sourceId, name, type, value: Number(value) },
      {
        onSuccess: () => {
          toast.success('Deducción creada.');
          setName('');
          setValue('');
        },
        onError: (error) => toast.error(incomeErrorMessage(error)),
      },
    );
  };

  const confirmDelete = () => {
    if (!confirmingDeleteId) return;
    deleteMutation.mutate(confirmingDeleteId, {
      onSuccess: () => toast.success('Deducción borrada.'),
      onError: (error) => toast.error(incomeErrorMessage(error)),
      onSettled: () => setConfirmingDeleteId(null),
    });
  };

  return (
    <div className="mt-2 flex flex-col gap-2 border-l border-line pl-3">
      {isPending && <p className="text-sm text-body">Cargando deducciones...</p>}

      {deductions && deductions.length === 0 && (
        <p className="text-sm text-body">Esta fuente no tiene deducciones.</p>
      )}

      {deductions && deductions.length > 0 && (
        <ul className="list-none p-0 m-0 flex flex-col gap-1">
          {deductions.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <span className={d.active ? 'text-ink' : 'text-body opacity-60'}>
                {d.name} — {d.type === 'PERCENTAGE' ? `${d.value}%` : d.value}
                {!d.active && ' (inactiva)'}
              </span>
              <span className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateMutation.mutate({ sourceId, id: d.id, active: !d.active })}
                  disabled={updateMutation.isPending}
                >
                  {d.active ? 'Desactivar' : 'Activar'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDeleteId(d.id)}
                >
                  Borrar
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} aria-label="Nueva deducción" className="flex flex-wrap items-end gap-2">
        <Input
          label="Nombre"
          id={`ded-name-${sourceId}`}
          type="text"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={createMutation.isPending}
        />
        <Select
          label="Tipo"
          id={`ded-type-${sourceId}`}
          value={type}
          onChange={(e) => setType(e.target.value as DeductionType)}
          disabled={createMutation.isPending}
        >
          <option value="PERCENTAGE">Porcentaje</option>
          <option value="FIXED">Monto fijo</option>
        </Select>
        <Input
          label="Valor"
          id={`ded-value-${sourceId}`}
          type="number"
          min="0.01"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          disabled={createMutation.isPending}
        />
        <Button type="submit" size="sm" loading={createMutation.isPending}>
          Agregar
        </Button>
      </form>

      <ConfirmDialog
        open={confirmingDeleteId !== null}
        danger
        title="Borrar deducción"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </div>
  );
}
