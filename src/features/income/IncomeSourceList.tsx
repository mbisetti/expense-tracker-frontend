import { useState, type FormEvent } from 'react';
import { Card } from '../../components/Card';
import { PlaceholderRow } from '../../components/SectionPlaceholder';
import { useIncomeSources } from './useIncomeSources';
import { useCreateIncomeSource } from './useIncomeMutations';
import { incomeErrorMessage } from './errorMessages';

export function IncomeSourceList() {
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('');

  const { data: sources, isPending, isError } = useIncomeSources();
  const createMutation = useCreateIncomeSource();

  const closeForm = () => {
    setFormOpen(false);
    setName('');
    setCurrency('');
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createMutation.mutate(
      { name, currency },
      { onSuccess: closeForm },
    );
  };

  return (
    <Card>
      <div className="flex justify-between items-center">
        <h2>Fuentes de ingreso</h2>
        {!formOpen && (
          <button type="button" onClick={() => setFormOpen(true)}>
            Nueva fuente
          </button>
        )}
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} aria-label="Nueva fuente">
          <label htmlFor="source-name">Nombre</label>
          <input
            id="source-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={createMutation.isPending}
          />

          <label htmlFor="source-currency">Moneda</label>
          <input
            id="source-currency"
            type="text"
            className="uppercase"
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
            disabled={createMutation.isPending}
          />

          {createMutation.isError && (
            <p role="alert">{incomeErrorMessage(createMutation.error)}</p>
          )}

          <button type="submit" disabled={createMutation.isPending}>
            Guardar
          </button>
          <button type="button" onClick={closeForm} disabled={createMutation.isPending}>
            Cancelar
          </button>
        </form>
      )}

      {isPending && (
        <div role="status" aria-label="Cargando fuentes" className="flex flex-col gap-3">
          <PlaceholderRow />
          <PlaceholderRow />
        </div>
      )}

      {isError && <p role="alert">No pudimos cargar las fuentes. Intentá de nuevo.</p>}

      {sources && sources.length === 0 && (
        <p>Todavía no tenés fuentes de ingreso. Creá una para registrar ingresos.</p>
      )}

      {sources && sources.length > 0 && (
        <ul className="list-none p-0 m-0 divide-y divide-line">
          {sources.map((source) => (
            <li key={source.id} className="py-2 flex justify-between">
              <span className={`text-ink${!source.active ? ' opacity-60' : ''}`}>
                {source.name}
                {!source.active && <span className="text-body text-sm"> (inactiva)</span>}
              </span>
              <span className="text-body text-sm">{source.currency}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
