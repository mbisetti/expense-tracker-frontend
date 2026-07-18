import { useState, type FormEvent } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import {
  useCreatePaymentMethod,
  type CreatePaymentMethodInput,
} from '../paymentMethods/usePaymentMethodMutations';
import { paymentMethodErrorMessage } from '../paymentMethods/errorMessages';
import { useCreateAccount, type CreateAccountInput } from './useAccountMutations';
import { accountErrorMessage } from './errorMessages';
import type { Account } from './api';

type CardType = 'DEBIT' | 'CREDIT';

type CardFormProps = {
  /** Cuenta madre (BANK/WALLET) de la que cuelga la tarjeta. */
  account: Account;
  onClose: () => void;
};

// Sprint 22.2: alta de una tarjeta desde el bloque de su cuenta madre (D2). Débito = un
// PaymentMethod de la cuenta; crédito = una cuenta CREDIT hija vinculada (linkedAccountId).
export function CardForm({ account, onClose }: CardFormProps) {
  const toast = useToast();
  const [cardType, setCardType] = useState<CardType>('DEBIT');
  const [name, setName] = useState('');
  // Crédito: moneda default = principal de la madre (editable) + ciclo required (espeja
  // la decisión de UI del AccountForm: una CREDIT sin ciclo no se crea desde el form).
  const [currency, setCurrency] = useState(account.currency);
  const [statementCloseDay, setStatementCloseDay] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('');

  const createPm = useCreatePaymentMethod();
  const createAccount = useCreateAccount();
  const mutation = cardType === 'DEBIT' ? createPm : createAccount;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cardType === 'DEBIT') {
      const input: CreatePaymentMethodInput = {
        accountId: account.id,
        name,
        type: 'DEBIT',
        isDefault: false,
      };
      createPm.mutate(input, {
        onSuccess: () => {
          toast.success('Tarjeta de débito agregada.');
          onClose();
        },
        onError: (error) => toast.error(paymentMethodErrorMessage(error)),
      });
    } else {
      const input: CreateAccountInput = {
        name,
        type: 'CREDIT',
        currency: currency.trim().toUpperCase(),
        isInformal: false,
        statementCloseDay: Number(statementCloseDay),
        paymentDueDay: Number(paymentDueDay),
        linkedAccountId: account.id,
      };
      createAccount.mutate(input, {
        onSuccess: () => {
          toast.success('Tarjeta de crédito agregada.');
          onClose();
        },
        onError: (error) => toast.error(accountErrorMessage(error)),
      });
    }
  };

  const isPending = mutation.isPending;

  return (
    <form onSubmit={handleSubmit} aria-label="Agregar tarjeta" className="flex flex-col gap-3">
      <Input
        label="Nombre"
        id="card-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Visa *4160"
        required
        maxLength={255}
        disabled={isPending}
      />

      <Select
        label="Tipo"
        id="card-type"
        value={cardType}
        onChange={(e) => setCardType(e.target.value as CardType)}
        disabled={isPending}
      >
        <option value="DEBIT">Débito</option>
        <option value="CREDIT">Crédito</option>
      </Select>

      {cardType === 'CREDIT' && (
        <>
          <Input
            label="Moneda (código de 3 letras)"
            id="card-currency"
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
          <Input
            label="Día de cierre (1-28)"
            id="card-statement-close-day"
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
            id="card-payment-due-day"
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

      <div className="flex items-center gap-3">
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
