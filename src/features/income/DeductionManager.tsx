import { useState, type FormEvent } from 'react';
import type { DeductionType } from './api';
import { useIncomeDeductions } from './useIncomeDeductions';
import { useCreateDeduction, useDeleteDeduction, useUpdateDeduction } from './useDeductionMutations';
import { incomeErrorMessage } from './errorMessages';

export function DeductionManager({ sourceId }: { sourceId: string }) {
  const { data: deductions, isPending } = useIncomeDeductions(sourceId);
  const createMutation = useCreateDeduction(sourceId);
  const updateMutation = useUpdateDeduction(sourceId);
  const deleteMutation = useDeleteDeduction(sourceId);

  const [name, setName] = useState('');
  const [type, setType] = useState<DeductionType>('PERCENTAGE');
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createMutation.mutate(
      { sourceId, name, type, value: Number(value) },
      { onSuccess: () => { setName(''); setValue(''); } },
    );
  };

  return (
    <div className="mt-2 pl-3 border-l border-line flex flex-col gap-2">
      {isPending && <p className="text-body text-sm">Cargando deducciones...</p>}

      {deductions && deductions.length === 0 && (
        <p className="text-body text-sm">Esta fuente no tiene deducciones.</p>
      )}

      {deductions && deductions.length > 0 && (
        <ul className="list-none p-0 m-0 flex flex-col gap-1">
          {deductions.map((d) => (
            <li key={d.id} className="flex justify-between items-center gap-2 text-sm">
              <span className={d.active ? 'text-ink' : 'text-body opacity-60'}>
                {d.name} — {d.type === 'PERCENTAGE' ? `${d.value}%` : d.value}
                {!d.active && ' (inactiva)'}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateMutation.mutate({ sourceId, id: d.id, active: !d.active })}
                  disabled={updateMutation.isPending}
                >
                  {d.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  className="text-expense"
                  onClick={() => deleteMutation.mutate(d.id)}
                  disabled={deleteMutation.isPending}
                >
                  Borrar
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} aria-label="Nueva deducción" className="flex flex-wrap gap-2 items-end">
        <span className="flex flex-col">
          <label htmlFor={`ded-name-${sourceId}`} className="text-sm">Nombre</label>
          <input
            id={`ded-name-${sourceId}`}
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={createMutation.isPending}
          />
        </span>
        <span className="flex flex-col">
          <label htmlFor={`ded-type-${sourceId}`} className="text-sm">Tipo</label>
          <select
            id={`ded-type-${sourceId}`}
            value={type}
            onChange={(e) => setType(e.target.value as DeductionType)}
            disabled={createMutation.isPending}
          >
            <option value="PERCENTAGE">Porcentaje</option>
            <option value="FIXED">Monto fijo</option>
          </select>
        </span>
        <span className="flex flex-col">
          <label htmlFor={`ded-value-${sourceId}`} className="text-sm">Valor</label>
          <input
            id={`ded-value-${sourceId}`}
            type="number"
            min="0.01"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            disabled={createMutation.isPending}
          />
        </span>
        <button type="submit" disabled={createMutation.isPending}>Agregar</button>
      </form>

      {createMutation.isError && (
        <p role="alert" className="text-sm">{incomeErrorMessage(createMutation.error)}</p>
      )}
    </div>
  );
}
