import { useState, type FormEvent } from 'react';
import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  type UpdatePaymentMethodInput,
} from './usePaymentMethodMutations';
import { paymentMethodErrorMessage } from './errorMessages';
import type { PaymentMethod, PaymentMethodType } from './api';

type PaymentMethodFormProps = {
  paymentMethod?: PaymentMethod;
  onClose: () => void;
};

export function PaymentMethodForm({ paymentMethod, onClose }: PaymentMethodFormProps) {
  const isEdit = paymentMethod !== undefined;

  const [name, setName] = useState(paymentMethod?.name ?? '');
  const [type, setType] = useState<PaymentMethodType>(paymentMethod?.type ?? 'CASH');
  const [isDefault, setIsDefault] = useState(paymentMethod?.isDefault ?? false);

  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();
  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEdit) {
      const changes: UpdatePaymentMethodInput = {};
      if (name !== paymentMethod.name) changes.name = name;
      if (type !== paymentMethod.type) changes.type = type;
      if (isDefault !== paymentMethod.isDefault) changes.isDefault = isDefault;

      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }
      updateMutation.mutate({ id: paymentMethod.id, changes }, { onSuccess: onClose });
    } else {
      createMutation.mutate({ name, type, isDefault }, { onSuccess: onClose });
    }
  };

  const isPending = mutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={isEdit ? 'Editar método de pago' : 'Nuevo método de pago'}
    >
      <h2>{isEdit ? 'Editar método de pago' : 'Nuevo método de pago'}</h2>

      <label htmlFor="pm-name">Nombre</label>
      <input
        id="pm-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={100}
        disabled={isPending}
      />

      <label htmlFor="pm-type">Tipo</label>
      <select
        id="pm-type"
        value={type}
        onChange={(e) => setType(e.target.value as PaymentMethodType)}
        disabled={isPending}
      >
        <option value="CASH">Efectivo</option>
        <option value="DEBIT">Débito</option>
        <option value="CREDIT">Crédito</option>
        <option value="DIGITAL_WALLET">Billetera digital</option>
        <option value="TRANSFER">Transferencia</option>
      </select>

      <label htmlFor="pm-default">
        <input
          id="pm-default"
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          disabled={isPending}
        />
        Usar como método por defecto
      </label>

      {mutation.isError && <p role="alert">{paymentMethodErrorMessage(mutation.error)}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Guardar'}
      </button>
      <button type="button" onClick={onClose} disabled={isPending}>
        Cancelar
      </button>
    </form>
  );
}
