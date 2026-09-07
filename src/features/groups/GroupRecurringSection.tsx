import { useState } from 'react';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DeleteButton } from '../../components/ui/ActionsMenu';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../components/ui/toastContext';
import { parseAmountInput } from '../../lib/money';
import { groupErrorMessage } from './errorMessages';
import {
  useCreateGroupRecurring,
  useDeleteGroupRecurring,
  useGroupRecurring,
  useToggleGroupRecurring,
} from './useGroupRecurring';
import type { GroupMember, RecurringFrequency } from './api';

type GroupRecurringSectionProps = {
  groupId: string;
  currency: string;
  members: GroupMember[];
  myMemberId: string;
};

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  WEEKLY: 'Todas las semanas',
  BIWEEKLY: 'Dos veces al mes',
  MONTHLY: 'Todos los meses',
  ANNUAL: 'Una vez al año',
};

const WEEKDAYS = [
  ['MONDAY', 'Lunes'],
  ['TUESDAY', 'Martes'],
  ['WEDNESDAY', 'Miércoles'],
  ['THURSDAY', 'Jueves'],
  ['FRIDAY', 'Viernes'],
  ['SATURDAY', 'Sábado'],
  ['SUNDAY', 'Domingo'],
];

export function GroupRecurringSection({
  groupId,
  currency,
  members,
  myMemberId,
}: GroupRecurringSectionProps) {
  const toast = useToast();
  const { data: recurring, isPending, isError } = useGroupRecurring(groupId);
  const create = useCreateGroupRecurring();
  const toggle = useToggleGroupRecurring();
  const remove = useDeleteGroupRecurring();

  const [formOpen, setFormOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState(myMemberId);
  const [frequency, setFrequency] = useState<RecurringFrequency>('MONTHLY');
  const [billingDay, setBillingDay] = useState('1');
  const [weekday, setWeekday] = useState('MONDAY');
  const [participants, setParticipants] = useState<string[]>(() => members.map((m) => m.id));

  const closeForm = () => {
    setFormOpen(false);
    setName('');
    setAmount('');
    setFrequency('MONTHLY');
    setBillingDay('1');
    setParticipants(members.map((m) => m.id));
  };

  const submit = () => {
    const total = parseAmountInput(amount) || 0;
    if (!name.trim() || total <= 0 || participants.length === 0) return;

    create.mutate(
      {
        groupId,
        input: {
          name: name.trim(),
          amount: total,
          currency,
          payerId,
          splitType: 'EQUAL',
          frequency,
          billingDay: frequency === 'WEEKLY' ? undefined : Number(billingDay),
          weekday: frequency === 'WEEKLY' ? weekday : undefined,
          dueMonth: frequency === 'ANNUAL' ? new Date().getMonth() + 1 : undefined,
          participants: participants.map((id) => ({ memberId: id })),
        },
      },
      {
        onSuccess: () => {
          toast.success('Listo. El gasto se va a anotar solo cuando venza.');
          closeForm();
        },
        onError: (error) => toast.error(groupErrorMessage(error)),
      },
    );
  };

  return (
    <Card header={<h2 className="text-base font-semibold text-ink">Gastos fijos</h2>}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          El alquiler, las expensas, lo que se repite. Se anota solo el día que vence, repartido
          igual que cualquier otro gasto.
        </p>

        {isPending && <Skeleton variant="list" rows={2} />}

        {isError && (
          <p role="alert" className="text-expense">
            No pudimos cargar los gastos fijos.
          </p>
        )}

        {recurring && recurring.length > 0 && (
          <ul className="flex flex-col gap-2">
            {recurring.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-ink">{item.name}</span>
                  <span className="text-sm text-muted">
                    {FREQUENCY_LABELS[item.frequency]} · Pone {item.payerName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Amount amount={item.amount} currency={item.currency} size="sm" tone="expense" />
                  {/* ariaLabel y no label: un "Activo" repetido en cada fila es ruido visual, y
                      el nombre del gasto hace el control identificable para el lector de pantalla. */}
                  <Switch
                    ariaLabel={`Activar ${item.name}`}
                    checked={item.active}
                    onChange={(checked) =>
                      toggle.mutate(
                        { groupId, recurringId: item.id, active: checked },
                        { onError: (error) => toast.error(groupErrorMessage(error)) },
                      )
                    }
                  />
                  <DeleteButton label={item.name} onClick={() => setConfirmingId(item.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div>
          <Button type="button" variant="secondary" onClick={() => setFormOpen(true)}>
            Nuevo gasto fijo
          </Button>
        </div>
      </div>

      <Modal open={formOpen} onClose={closeForm} title="Nuevo gasto fijo">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            label="Nombre"
            value={name}
            maxLength={100}
            placeholder="Alquiler, expensas, internet"
            onChange={(e) => setName(e.target.value)}
          />

          <MoneyInput
            label="Monto"
            id="group-recurring-amount"
            value={amount}
            onValueChange={setAmount}
            required
          />

          <Select
            label="¿Quién lo paga?"
            id="group-recurring-payer"
            value={payerId}
            helper="Siempre el mismo. El mes que lo pague otro, se carga como gasto suelto."
            onChange={(e) => setPayerId(e.target.value)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </Select>

          <Select
            label="Cada cuánto"
            id="group-recurring-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
          >
            {(Object.keys(FREQUENCY_LABELS) as RecurringFrequency[]).map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </option>
            ))}
          </Select>

          {frequency === 'WEEKLY' ? (
            <Select
              label="Qué día"
              id="group-recurring-weekday"
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
            >
              {WEEKDAYS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Qué día del mes"
              type="number"
              min={1}
              max={frequency === 'BIWEEKLY' ? 15 : 31}
              value={billingDay}
              helper={
                frequency === 'BIWEEKLY'
                  ? 'Del 1 al 15. La segunda cae quince días después.'
                  : 'Si el mes no llega a ese día, cae el último.'
              }
              onChange={(e) => setBillingDay(e.target.value)}
            />
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-muted">Entre quiénes se reparte</legend>
            {members.map((member) => (
              <label key={member.id} className="flex min-h-11 items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  checked={participants.includes(member.id)}
                  onChange={() =>
                    setParticipants((current) =>
                      current.includes(member.id)
                        ? current.filter((id) => id !== member.id)
                        : [...current, member.id],
                    )
                  }
                />
                {member.displayName}
              </label>
            ))}
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={create.isPending}
              disabled={!name.trim() || (parseAmountInput(amount) || 0) <= 0 || participants.length === 0}
            >
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmingId !== null}
        danger
        title="Borrar el gasto fijo"
        message="Deja de generarse de acá en adelante. Los gastos que ya se anotaron no se tocan, porque son plata que se movió de verdad."
        confirmLabel="Borrar"
        loading={remove.isPending}
        onConfirm={() => {
          if (!confirmingId) return;
          remove.mutate(
            { groupId, recurringId: confirmingId },
            {
              onSuccess: () => toast.success('Gasto fijo borrado.'),
              onError: (error) => toast.error(groupErrorMessage(error)),
              onSettled: () => setConfirmingId(null),
            },
          );
        }}
        onCancel={() => setConfirmingId(null)}
      />
    </Card>
  );
}
