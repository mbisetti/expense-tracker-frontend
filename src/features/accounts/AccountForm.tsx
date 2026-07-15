import { useState, type FormEvent } from 'react';
import { useCreateAccount, useUpdateAccount, type UpdateAccountInput } from './useAccountMutations';
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

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedCurrency = currency.trim().toUpperCase();

    if (isEdit) {
      const changes: UpdateAccountInput = {};
      if (name !== account.name) changes.name = name;
      if (type !== account.type) changes.type = type;
      if (normalizedCurrency !== account.currency) changes.currency = normalizedCurrency;
      if (isInformal !== account.isInformal) changes.isInformal = isInformal;

      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }
      updateMutation.mutate({ id: account.id, changes }, { onSuccess: onClose });
    } else {
      createMutation.mutate(
        { name, type, currency: normalizedCurrency, isInformal },
        { onSuccess: onClose },
      );
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
