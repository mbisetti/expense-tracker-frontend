import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { DateField } from '../../components/ui/DateField';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney, parseAmountInput } from '../../lib/money';
import { useCategories } from '../categories/useCategories';
import { groupErrorMessage } from './errorMessages';
import { useCreateGroupExpense, useUpdateGroupExpense } from './useGroupExpenses';
import type { GroupExpense, GroupMember, SplitType } from './api';

type GroupExpenseModalProps = {
  open: boolean;
  onClose: () => void;
  groupId: string;
  currency: string;
  members: GroupMember[];
  myMemberId: string;
  /** Presente = estamos editando ese gasto. Ausente = uno nuevo. */
  expense?: GroupExpense | null;
};

const SPLIT_LABELS: Record<SplitType, string> = {
  EQUAL: 'En partes iguales',
  EXACT: 'Montos exactos',
  PERCENT: 'Por porcentaje',
  SHARES: 'Por partes',
};

// Qué significa el número que se tipea al lado de cada persona, según el modo.
//
// En EXACT dice "Le toca" y no "Monto" a propósito: arriba ya hay un campo Monto, que es el del
// gasto entero. Dos campos con el mismo nombre en el mismo formulario significando cosas
// distintas se leen mal, y encima hacen ambiguo el nombre accesible.
const VALUE_LABEL: Record<SplitType, string> = {
  EQUAL: '',
  EXACT: 'Le toca',
  PERCENT: '%',
  SHARES: 'Partes',
};

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function GroupExpenseModal({
  open,
  onClose,
  groupId,
  currency,
  members,
  myMemberId,
  expense,
}: GroupExpenseModalProps) {
  const toast = useToast();
  const { data: categories } = useCategories();
  const createExpense = useCreateGroupExpense();
  const updateExpense = useUpdateGroupExpense();
  const editing = expense ?? null;

  // El estado arranca del gasto que se edita, en el MOUNT. El caller monta con key, así que no
  // hace falta ningún efecto que lo sincronice (mismo idioma que MyMembershipCard).
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [date, setDate] = useState(editing?.date ?? todayLocal());
  const [categoryId, setCategoryId] = useState(editing?.categoryHint ?? '');
  // Un reparto por porcentaje o por partes se reabre como MONTOS EXACTOS: la respuesta trae la
  // plata ya resuelta, no el porcentaje que se tipeó. Es la misma plata; volver a expresarlo en
  // porcentajes es cambiar el modo y escribirlo de nuevo.
  const [splitType, setSplitType] = useState<SplitType>(
    editing ? (editing.splitType === 'EQUAL' ? 'EQUAL' : 'EXACT') : 'EQUAL',
  );

  // Arranca con todos adentro porque es el caso común, pero se destildan: un gasto es de los que
  // participan, no de todo el grupo.
  const [participants, setParticipants] = useState<string[]>(() =>
    editing ? editing.splits.map((s) => s.memberId) : members.map((m) => m.id),
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    editing && editing.splitType !== 'EQUAL'
      ? Object.fromEntries(editing.splits.map((s) => [s.memberId, String(s.amount)]))
      : {},
  );

  const [singlePayer, setSinglePayer] = useState(editing?.payers[0]?.memberId ?? myMemberId);
  const [severalPayers, setSeveralPayers] = useState((editing?.payers.length ?? 0) > 1);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(() =>
    editing && editing.payers.length > 1
      ? Object.fromEntries(editing.payers.map((p) => [p.memberId, String(p.amount)]))
      : {},
  );

  const total = parseAmountInput(amount) || 0;
  const expenseCategories = (categories ?? []).filter((c) => c.type !== 'INCOME');

  const paidSum = useMemo(() => {
    if (!severalPayers) return total;
    return members.reduce((acc, m) => acc + (parseAmountInput(payerAmounts[m.id] ?? '') || 0), 0);
  }, [severalPayers, total, members, payerAmounts]);

  const valuesSum = useMemo(
    () => participants.reduce((acc, id) => acc + (parseAmountInput(values[id] ?? '') || 0), 0),
    [participants, values],
  );

  // Qué falta para que el reparto cierre. Se muestra en vivo porque descubrirlo recién al apretar
  // Guardar es la diferencia entre corregir un número y volver a empezar el formulario.
  const splitProblem = useMemo(() => {
    if (participants.length === 0) return 'Elegí al menos a una persona.';
    if (total <= 0) return null;
    if (splitType === 'EXACT' && Math.abs(valuesSum - total) > 0.004) {
      return `Los montos suman ${formatMoney(valuesSum, currency)} y el gasto es ${formatMoney(total, currency)}.`;
    }
    if (splitType === 'PERCENT' && Math.abs(valuesSum - 100) > 0.004) {
      return `Los porcentajes suman ${valuesSum}, tienen que sumar 100.`;
    }
    if (splitType === 'SHARES' && participants.some((id) => (parseAmountInput(values[id] ?? '') || 0) <= 0)) {
      return 'Cada persona tiene que tener al menos una parte.';
    }
    return null;
  }, [participants, splitType, valuesSum, total, values, currency]);

  const payerProblem = useMemo(() => {
    if (!severalPayers || total <= 0) return null;
    if (Math.abs(paidSum - total) > 0.004) {
      return `Entre todos pusieron ${formatMoney(paidSum, currency)} y el gasto es ${formatMoney(total, currency)}.`;
    }
    return null;
  }, [severalPayers, paidSum, total, currency]);

  const toggleParticipant = (memberId: string) => {
    setParticipants((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  };

  const reset = () => {
    setAmount('');
    setDescription('');
    setDate(todayLocal());
    setCategoryId('');
    setSplitType('EQUAL');
    setParticipants(members.map((m) => m.id));
    setValues({});
    setSeveralPayers(false);
    setPayerAmounts({});
    setSinglePayer(myMemberId);
  };

  const submit = () => {
    if (total <= 0 || splitProblem || payerProblem) return;

    const input = {
      amount: total,
      currency,
      date,
      description: description.trim() || null,
      categoryHint: categoryId || null,
      splitType,
      payers: severalPayers
        ? members
            .filter((m) => (parseAmountInput(payerAmounts[m.id] ?? '') || 0) > 0)
            .map((m) => ({ memberId: m.id, amount: parseAmountInput(payerAmounts[m.id]) }))
        : [{ memberId: singlePayer, amount: total }],
      participants: participants.map((id) => ({
        memberId: id,
        value: splitType === 'EQUAL' ? undefined : parseAmountInput(values[id] ?? '') || 0,
      })),
    };

    const handlers = {
      onSuccess: (saved: GroupExpense) => {
        if (saved.membersWithoutAccount.length > 0) {
          toast.success('Gasto anotado. A alguien del grupo le falta elegir su cuenta.');
        } else {
          toast.success(editing ? 'Gasto actualizado.' : 'Gasto anotado.');
        }
        reset();
        onClose();
      },
      onError: (error: unknown) => toast.error(groupErrorMessage(error)),
    };

    if (editing) {
      updateExpense.mutate({ groupId, expenseId: editing.id, input }, handlers);
    } else {
      createExpense.mutate({ groupId, input }, handlers);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar gasto' : 'Nuevo gasto'} size="wide">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <MoneyInput label="Monto" id="group-expense-amount" value={amount} onValueChange={setAmount} required />

        <Input
          label="Descripción"
          value={description}
          maxLength={500}
          placeholder="Cena, super, alquiler"
          onChange={(e) => setDescription(e.target.value)}
        />

        <DateField label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} />

        <Select
          label="Categoría sugerida"
          id="group-expense-category"
          value={categoryId}
          helper="Cada uno usa la suya si la configuró. Esta es para el que no tiene ninguna."
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Sin sugerencia</option>
          {expenseCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        <fieldset className="flex flex-col gap-2 border-t border-line pt-4">
          <legend className="sr-only">Quién pagó</legend>
          {!severalPayers && (
            <Select
              label="¿Quién pagó?"
              id="group-expense-payer"
              value={singlePayer}
              onChange={(e) => setSinglePayer(e.target.value)}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </Select>
          )}

          {severalPayers && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">Cuánto puso cada uno.</p>
              {members.map((member) => (
                <MoneyInput
                  key={member.id}
                  label={member.displayName}
                  id={`payer-${member.id}`}
                  value={payerAmounts[member.id] ?? ''}
                  onValueChange={(v) => setPayerAmounts((c) => ({ ...c, [member.id]: v }))}
                />
              ))}
              {payerProblem && (
                <p role="alert" className="text-sm text-expense">
                  {payerProblem}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            className="self-start text-sm text-muted underline transition-colors duration-200 ease-out hover:text-ink"
            onClick={() => setSeveralPayers((v) => !v)}
          >
            {severalPayers ? 'Pagó una sola persona' : 'Pagaron entre varios'}
          </button>
        </fieldset>

        <fieldset className="flex flex-col gap-3 border-t border-line pt-4">
          <legend className="sr-only">Cómo se reparte</legend>

          <Select
            label="Cómo se reparte"
            id="group-expense-split"
            value={splitType}
            onChange={(e) => setSplitType(e.target.value as SplitType)}
          >
            {(Object.keys(SPLIT_LABELS) as SplitType[]).map((type) => (
              <option key={type} value={type}>
                {SPLIT_LABELS[type]}
              </option>
            ))}
          </Select>

          <p className="text-sm text-muted">Quiénes participan de este gasto.</p>
          {members.map((member) => {
            const checked = participants.includes(member.id);
            return (
              <div key={member.id} className="flex flex-wrap items-end gap-2">
                <label className="flex min-h-11 flex-1 items-center gap-2 text-ink">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleParticipant(member.id)}
                  />
                  {member.displayName}
                </label>
                {checked && splitType !== 'EQUAL' && (
                  <div className="w-32">
                    <Input
                      label={VALUE_LABEL[splitType]}
                      inputMode="decimal"
                      value={values[member.id] ?? ''}
                      onChange={(e) => setValues((c) => ({ ...c, [member.id]: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {splitProblem && (
            <p role="alert" className="text-sm text-expense">
              {splitProblem}
            </p>
          )}
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={createExpense.isPending || updateExpense.isPending}
            disabled={total <= 0 || Boolean(splitProblem) || Boolean(payerProblem)}
          >
            Guardar gasto
          </Button>
        </div>
      </form>
    </Modal>
  );
}
