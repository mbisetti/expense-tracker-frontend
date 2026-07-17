import { useState, type FormEvent } from 'react';
import {
  useCreateAccount,
  useUpdateAccount,
  type CreateAccountInput,
  type UpdateAccountInput,
} from './useAccountMutations';
import { accountErrorMessage } from './errorMessages';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import type { Account, AccountType } from './api';

type AccountFormProps = {
  account?: Account;
  onClose: () => void;
  /** En edición: dispara el borrado (con confirmación en la página). */
  onDelete?: () => void;
};

export function AccountForm({ account, onClose, onDelete }: AccountFormProps) {
  const isEdit = account !== undefined;
  const toast = useToast();

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'CASH');
  const [currency, setCurrency] = useState(account?.currency ?? 'ARS');
  const [isInformal, setIsInformal] = useState(account?.isInformal ?? false);
  const [statementCloseDay, setStatementCloseDay] = useState(
    account?.statementCloseDay != null ? String(account.statementCloseDay) : '',
  );
  const [paymentDueDay, setPaymentDueDay] = useState(
    account?.paymentDueDay != null ? String(account.paymentDueDay) : '',
  );

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedCurrency = currency.trim().toUpperCase();
    // null = campo vacío (sin valor); undefined solo se usa para "no tocar" en el diff de edición.
    const closeDayNum = statementCloseDay === '' ? null : Number(statementCloseDay);
    const dueDayNum = paymentDueDay === '' ? null : Number(paymentDueDay);

    if (isEdit) {
      const changes: UpdateAccountInput = {};
      if (name !== account.name) changes.name = name;
      if (type !== account.type) changes.type = type;
      if (normalizedCurrency !== account.currency) changes.currency = normalizedCurrency;
      if (isInformal !== account.isInformal) changes.isInformal = isInformal;

      // Atómico: si cambió alguno de los dos días, se mandan LOS DOS juntos (ambos son
      // required para CREDIT → nunca null acá, así no se genera un PATCH parcial que el
      // backend rechazaría). Quitar el ciclo no se soporta vía PATCH (los inputs son
      // required) — backlog.
      if (
        type === 'CREDIT' &&
        closeDayNum !== null &&
        dueDayNum !== null &&
        (closeDayNum !== account.statementCloseDay || dueDayNum !== account.paymentDueDay)
      ) {
        changes.statementCloseDay = closeDayNum;
        changes.paymentDueDay = dueDayNum;
      }

      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }
      updateMutation.mutate(
        { id: account.id, changes },
        {
          onSuccess: () => {
            toast.success('Cuenta actualizada.');
            onClose();
          },
          onError: (error) => toast.error(accountErrorMessage(error)),
        },
      );
    } else {
      const input: CreateAccountInput = { name, type, currency: normalizedCurrency, isInformal };
      // Atómico: en alta, solo se manda el par completo; si falta uno, no se manda ninguno.
      if (type === 'CREDIT' && closeDayNum !== null && dueDayNum !== null) {
        input.statementCloseDay = closeDayNum;
        input.paymentDueDay = dueDayNum;
      }
      createMutation.mutate(input, {
        onSuccess: () => {
          toast.success('Cuenta creada.');
          onClose();
        },
        onError: (error) => toast.error(accountErrorMessage(error)),
      });
    }
  };

  const isPending = mutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}
      className="flex flex-col gap-3"
    >
      <Input
        label="Nombre"
        id="acc-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={255}
        disabled={isPending}
      />

      <Select
        label="Tipo"
        id="acc-type"
        value={type}
        onChange={(e) => setType(e.target.value as AccountType)}
        disabled={isPending}
      >
        <option value="CASH">Efectivo</option>
        <option value="DEBIT">Débito</option>
        <option value="CREDIT">Crédito</option>
      </Select>

      <Input
        label="Moneda (código de 3 letras)"
        id="acc-currency"
        type="text"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        required
        minLength={3}
        maxLength={3}
        pattern="[A-Za-z]{3}"
        title="Código ISO de 3 letras, ej: ARS, USD"
        disabled={isPending}
      />

      {type === 'CREDIT' && (
        <>
          {/* required para CREDIT: fuerza el par completo (o los dos o ninguno) y evita
              tanto el PATCH parcial como el "blanquear = no-op silencioso". Una CREDIT sin
              ciclo es válida en el backend pero no se crea desde el form (decisión de UI). */}
          <Input
            label="Día de cierre (1-28)"
            id="acc-statement-close-day"
            type="number"
            min={1}
            max={28}
            value={statementCloseDay}
            onChange={(e) => setStatementCloseDay(e.target.value)}
            required
            disabled={isPending}
          />

          <Input
            label="Día de vencimiento (1-28)"
            id="acc-payment-due-day"
            type="number"
            min={1}
            max={28}
            value={paymentDueDay}
            onChange={(e) => setPaymentDueDay(e.target.value)}
            required
            disabled={isPending}
          />
        </>
      )}

      <label htmlFor="acc-informal" className="flex items-center gap-2 text-sm text-ink">
        <input
          id="acc-informal"
          type="checkbox"
          checked={isInformal}
          onChange={(e) => setIsInformal(e.target.checked)}
          disabled={isPending}
          className="h-5 w-5 rounded-sm border border-line accent-brand"
        />
        Cuenta informal (efectivo, cripto, fuera del banco)
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isPending}>
          Guardar
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isPending}
          className={isEdit && onDelete ? 'mx-auto' : undefined}
        >
          Cancelar
        </Button>
        {isEdit && onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isPending}
            className="border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
          >
            Borrar
          </Button>
        )}
      </div>
    </form>
  );
}
