import { useState, type FormEvent } from 'react';
import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  type UpdatePaymentMethodInput,
} from './usePaymentMethodMutations';
import { paymentMethodErrorMessage } from './errorMessages';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { useAccounts } from '../accounts/useAccounts';
import type { PaymentMethod, PaymentMethodType } from './api';

type PaymentMethodFormProps = {
  paymentMethod?: PaymentMethod;
  onClose: () => void;
};

export function PaymentMethodForm({ paymentMethod, onClose }: PaymentMethodFormProps) {
  const isEdit = paymentMethod !== undefined;
  const toast = useToast();

  const [accountId, setAccountId] = useState(paymentMethod?.accountId ?? '');
  const [name, setName] = useState(paymentMethod?.name ?? '');
  const [type, setType] = useState<PaymentMethodType>(paymentMethod?.type ?? 'CASH');
  const [isDefault, setIsDefault] = useState(paymentMethod?.isDefault ?? false);

  const { data: accounts } = useAccounts();
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
      updateMutation.mutate(
        { id: paymentMethod.id, changes },
        {
          onSuccess: () => {
            toast.success('Método de pago actualizado.');
            onClose();
          },
          onError: (error) => toast.error(paymentMethodErrorMessage(error)),
        },
      );
    } else {
      createMutation.mutate(
        { accountId, name, type, isDefault },
        {
          onSuccess: () => {
            toast.success('Método de pago creado.');
            onClose();
          },
          onError: (error) => toast.error(paymentMethodErrorMessage(error)),
        },
      );
    }
  };

  const isPending = mutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={isEdit ? 'Editar método de pago' : 'Nuevo método de pago'}
      className="flex flex-col gap-3 rounded-md border border-line bg-surface-elevated p-4"
    >
      <h2 className="text-lg font-semibold text-ink">
        {isEdit ? 'Editar método de pago' : 'Nuevo método de pago'}
      </h2>

      {/* La cuenta a la que pertenece el método. Inmutable en edición (el backend no permite
          moverlo de cuenta) → se muestra deshabilitado. */}
      <Select
        label="Cuenta"
        id="pm-account"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        required
        disabled={isEdit || isPending}
      >
        <option value="">Elegí una cuenta</option>
        {accounts?.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} ({account.currency})
          </option>
        ))}
      </Select>

      <Input
        label="Nombre"
        id="pm-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={100}
        disabled={isPending}
      />

      <Select
        label="Tipo"
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
      </Select>

      <label htmlFor="pm-default" className="flex items-center gap-2 text-sm text-ink">
        <input
          id="pm-default"
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          disabled={isPending}
          className="h-5 w-5 rounded-sm border border-line accent-brand"
        />
        Usar como método por defecto
      </label>

      <div className="flex gap-3">
        <Button type="submit" loading={isPending}>
          Guardar
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
