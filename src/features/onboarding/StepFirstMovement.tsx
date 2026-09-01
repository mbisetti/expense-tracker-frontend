import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DateField } from '../../components/ui/DateField';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Select } from '../../components/ui/Select';
import { CheckCircleIcon } from '../../components/ui/icons';
import { useToast } from '../../components/ui/toastContext';
import { parseAmountInput } from '../../lib/money';
import { useCategories } from '../categories/useCategories';
import { useCreateTransaction } from '../transactions/useTransactionMutations';
import { transactionErrorMessage } from '../transactions/errorMessages';
import { StepIntro } from './StepIntro';
import type { Account } from '../accounts/api';

// Fecha local, no UTC: toISOString() adelanta un día pasadas las 21:00 en UTC-3.
function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

type StepFirstMovementProps = {
  accounts: Account[];
  /** Sale del wizard hacia /datos marcándolo completo (D8). */
  onGoToImport: () => void;
};

/**
 * Paso 4 — el primer movimiento, por las dos puertas que hay.
 *
 * El form de acá es MÍNIMO (cuenta, monto, fecha, categoría opcional, descripción) y no el
 * TransactionForm completo: el de siempre trae cuotas, compartidos, recurrentes y transferencias,
 * que en el minuto tres de una cuenta nueva son ruido. El completo se encuentra solo en
 * Transacciones.
 *
 * La otra puerta es el import, que ya existe entero en /datos con plantilla, previsualización y
 * deshacer (D8): se explica y se linkea, no se duplica adentro del wizard.
 */
export function StepFirstMovement({ accounts, onGoToImport }: StepFirstMovementProps) {
  const spendable = accounts.filter((a) => a.systemRole !== 'FRIEND_DEBTS' && a.type !== 'DEBT');
  const categories = useCategories();
  const createTransaction = useCreateTransaction();
  const toast = useToast();

  const [accountId, setAccountId] = useState(spendable[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    createTransaction.mutate(
      {
        accountId,
        type: 'EXPENSE',
        amount: parseAmountInput(amount),
        date,
        categoryId: categoryId || undefined,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSaved(true);
          toast.success('Gasto anotado.');
        },
        onError: (error) => toast.error(transactionErrorMessage(error)),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <StepIntro
        title="Tu primer movimiento"
        lines={[
          'Anotá un gasto que hayas hecho hoy o traé todo tu historial de una.',
          'Con cualquiera de las dos ya vas a ver la app con tus números.',
        ]}
      />

      <Card header={<h2 className="font-semibold text-ink">Anotá tu último gasto</h2>}>
        {saved ? (
          <p className="flex items-center gap-2 text-sm text-income">
            <CheckCircleIcon className="h-4 w-4" />
            Listo, tu primer gasto quedó anotado.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Select
              label="Cuenta"
              id="onboarding-expense-account"
              value={accountId}
              required
              disabled={createTransaction.isPending}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {spendable.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>

            <MoneyInput
              label="Monto"
              id="onboarding-expense-amount"
              value={amount}
              onValueChange={setAmount}
              required
              disabled={createTransaction.isPending}
            />

            <DateField
              label="Fecha"
              id="onboarding-expense-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={createTransaction.isPending}
            />

            <Select
              label="Categoría"
              id="onboarding-expense-category"
              value={categoryId}
              disabled={createTransaction.isPending}
              onChange={(e) => setCategoryId(e.target.value)}
              helper="Opcional. Podés categorizarlo después."
            >
              <option value="">Sin categoría</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            <Input
              label="Descripción"
              id="onboarding-expense-description"
              value={description}
              disabled={createTransaction.isPending}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Súper"
            />

            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="self-start"
              loading={createTransaction.isPending}
              disabled={accountId === '' || amount.trim() === ''}
            >
              Anotar el gasto
            </Button>
          </form>
        )}
      </Card>

      <Card header={<h2 className="font-semibold text-ink">Traé tu historial</h2>}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-body">
            Te damos una planilla armada con tus cuentas y tus categorías. La completás, la subís
            y te mostramos qué va a entrar antes de guardar nada.
          </p>
          <p className="text-sm text-muted">
            Si algo sale mal, una importación se deshace entera de un toque.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={onGoToImport}
          >
            Ir a importar
          </Button>
        </div>
      </Card>
    </div>
  );
}
