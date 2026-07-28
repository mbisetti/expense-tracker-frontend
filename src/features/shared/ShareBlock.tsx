import { useState } from 'react';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Switch } from '../../components/ui/Switch';
import { Button } from '../../components/ui/Button';
import { formatMoney, numberToAmountDisplay } from '../../lib/money';
import { usePeople, useCreatePerson } from './useShared';
import { sharedErrorMessage } from './errorMessages';
import { shareAmounts, yourPart, type ShareMode, type ShareRow } from './api';

type ShareBlockProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  rows: ShareRow[];
  onRowsChange: (rows: ShareRow[]) => void;
  mode: ShareMode;
  onModeChange: (mode: ShareMode) => void;
  /** Total del gasto (lo que salió de la cuenta). Manda el ÷ en partes iguales. */
  total: number;
  currency: string;
  disabled?: boolean;
  /** Personas con el cobro ya registrado: su monto es inmutable y no se pueden sacar. */
  settledPersonIds?: string[];
};

const NEW_PERSON = '__new_person__';

export function ShareBlock({
  enabled,
  onEnabledChange,
  rows,
  onRowsChange,
  mode,
  onModeChange,
  total,
  currency,
  disabled,
  settledPersonIds = [],
}: ShareBlockProps) {
  const [picking, setPicking] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const { data: people } = usePeople();
  const createPerson = useCreatePerson();

  const personName = (id: string) => people?.find((p) => p.id === id)?.name ?? '—';
  const isSettled = (personId: string) => settledPersonIds.includes(personId);

  const amounts = shareAmounts(rows, mode, total);
  const shared = amounts.reduce((sum, amount) => sum + amount, 0);
  const yours = yourPart(total, amounts);
  const overflow = yours < 0;

  const available = (people ?? []).filter((p) => !rows.some((row) => row.personId === p.id));

  const addPerson = (personId: string) => {
    onRowsChange([...rows, { personId, amount: '' }]);
    setPicking('');
  };

  const handlePick = (value: string) => {
    if (value === NEW_PERSON) {
      setPicking(NEW_PERSON);
      return;
    }
    if (value) addPerson(value);
  };

  // Alta al vuelo: el backend devuelve la persona existente si el nombre ya está tomado, así que
  // tipear a alguien que ya tenías no rompe nada — simplemente lo agrega al reparto.
  const handleCreatePerson = () => {
    const name = newName.trim();
    if (!name) return;
    setError('');
    createPerson.mutate(name, {
      onSuccess: (person) => {
        setNewName('');
        setPicking('');
        if (!rows.some((row) => row.personId === person.id)) addPerson(person.id);
      },
      onError: (err) => setError(sharedErrorMessage(err)),
    });
  };

  const removeRow = (personId: string) =>
    onRowsChange(rows.filter((row) => row.personId !== personId));

  const changeAmount = (personId: string, amount: string) =>
    onRowsChange(rows.map((row) => (row.personId === personId ? { ...row, amount } : row)));

  // Pasar a manual congela lo que se está viendo: el usuario retoca desde el reparto equitativo
  // en vez de arrancar de campos vacíos.
  const switchToManual = () => {
    onRowsChange(rows.map((row, i) => ({ ...row, amount: numberToAmountDisplay(amounts[i]) })));
    onModeChange('manual');
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <Switch
        id="tx-shared"
        label="Hoy por vos, mañana por mí"
        helper="Pagaste vos y te lo devuelven"
        checked={enabled}
        onChange={(value) => {
          onEnabledChange(value);
          if (!value) onRowsChange([]);
        }}
        disabled={disabled}
      />

      {enabled && (
        <>
          {rows.length > 0 && (
            <div role="group" aria-label="Modo de reparto" className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === 'even' ? 'primary' : 'secondary'}
                onClick={() => onModeChange('even')}
                disabled={disabled}
              >
                En partes iguales
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'manual' ? 'primary' : 'secondary'}
                onClick={switchToManual}
                disabled={disabled}
              >
                Montos por persona
              </Button>
            </div>
          )}

          {rows.map((row, i) => (
            <div key={row.personId} className="flex items-end gap-2">
              <div className="flex-1">
                <MoneyInput
                  label={personName(row.personId)}
                  id={`share-${row.personId}`}
                  value={mode === 'even' ? numberToAmountDisplay(amounts[i]) : row.amount}
                  onValueChange={(value) => changeAmount(row.personId, value)}
                  disabled={disabled || mode === 'even' || isSettled(row.personId)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(row.personId)}
                disabled={disabled || isSettled(row.personId)}
                aria-label={`Sacar a ${personName(row.personId)}`}
              >
                Sacar
              </Button>
            </div>
          ))}

          {picking === NEW_PERSON ? (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Nombre"
                  id="share-new-person"
                  type="text"
                  maxLength={100}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Juan"
                  disabled={disabled || createPerson.isPending}
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleCreatePerson}
                loading={createPerson.isPending}
              >
                Agregar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setPicking('');
                  setNewName('');
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Select
              label="Con quién"
              id="share-person-picker"
              value=""
              onChange={(e) => handlePick(e.target.value)}
              disabled={disabled}
            >
              <option value="">Agregar persona…</option>
              {available.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
              <option value={NEW_PERSON}>+ Nueva persona…</option>
            </Select>
          )}

          {error && (
            <p role="alert" className="text-sm text-expense">
              {error}
            </p>
          )}

          {rows.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-line pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-body">Te corresponde</span>
                <span
                  className={`font-semibold tabular-nums ${overflow ? 'text-expense' : 'text-ink'}`}
                >
                  {formatMoney(yours, currency)}
                </span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Te deben</span>
                <span className="tabular-nums">{formatMoney(shared, currency)}</span>
              </div>
              {overflow && (
                <p role="alert" className="text-expense">
                  Lo que repartiste supera el total del gasto.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
