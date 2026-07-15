import { useState, type FormEvent } from 'react';
import {
  useCreateAccount,
  useUpdateAccount,
  type CreateAccountInput,
  type UpdateAccountInput,
} from './useAccountMutations';
import { accountErrorMessage } from './errorMessages';
import type { Account, AccountType } from './api';

type AccountFormProps = {
  account?: Account;
  onClose: () => void;
};

export function AccountForm({ account, onClose }: AccountFormProps) {
  const isEdit = account !== undefined;

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
      updateMutation.mutate({ id: account.id, changes }, { onSuccess: onClose });
    } else {
      const input: CreateAccountInput = { name, type, currency: normalizedCurrency, isInformal };
      // Atómico: en alta, solo se manda el par completo; si falta uno, no se manda ninguno.
      if (type === 'CREDIT' && closeDayNum !== null && dueDayNum !== null) {
        input.statementCloseDay = closeDayNum;
        input.paymentDueDay = dueDayNum;
      }
      createMutation.mutate(input, { onSuccess: onClose });
    }
  };

  const isPending = mutation.isPending;

  return (
    <form onSubmit={handleSubmit} aria-label={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}>
      <h2>{isEdit ? 'Editar cuenta' : 'Nueva cuenta'}</h2>

      <label htmlFor="acc-name">Nombre</label>
      <input
        id="acc-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={255}
        disabled={isPending}
      />

      <label htmlFor="acc-type">Tipo</label>
      <select
        id="acc-type"
        value={type}
        onChange={(e) => setType(e.target.value as AccountType)}
        disabled={isPending}
      >
        <option value="CASH">Efectivo</option>
        <option value="DEBIT">Débito</option>
        <option value="CREDIT">Crédito</option>
      </select>

      <label htmlFor="acc-currency">Moneda (código de 3 letras)</label>
      <input
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
          <label htmlFor="acc-statement-close-day">Día de cierre (1-28)</label>
          <input
            id="acc-statement-close-day"
            type="number"
            min={1}
            max={28}
            value={statementCloseDay}
            onChange={(e) => setStatementCloseDay(e.target.value)}
            required
            disabled={isPending}
          />

          <label htmlFor="acc-payment-due-day">Día de vencimiento (1-28)</label>
          <input
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

      <label htmlFor="acc-informal">
        <input
          id="acc-informal"
          type="checkbox"
          checked={isInformal}
          onChange={(e) => setIsInformal(e.target.checked)}
          disabled={isPending}
        />{' '}
        Cuenta informal (efectivo, cripto — fuera del banco)
      </label>

      {mutation.isError && <p role="alert">{accountErrorMessage(mutation.error)}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Guardar'}
      </button>
      <button type="button" onClick={onClose} disabled={isPending}>
        Cancelar
      </button>
    </form>
  );
}
