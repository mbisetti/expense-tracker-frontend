import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { DateField } from '../../components/ui/DateField';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney, numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import { useIncomeEntries } from './useIncomeEntries';
import { useCreateIncomeEntry } from './useIncomeMutations';
import { incomeErrorMessage } from './errorMessages';
import { ConceptInput } from './ConceptInput';
import type { ExpectedIncomeSource } from './api';

type Props = {
  source: ExpectedIncomeSource;
  onClose: () => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * S36 (FR-1/D1) — "ya cobré esto". El tick NO anota de una: abre este confirm con la cuenta y el
 * monto ya cargados, los dos editables.
 *
 * El motivo es que el caso normal es que el monto real difiera del esperado (esperabas $800.000,
 * te depositaron $780.000). Un tick puro obligaría a corregir después, que es más trabajo que
 * confirmar ahora. Y la fecha esperada tampoco es confiable: por ley el sueldo entra dentro de
 * los 5 días hábiles del mes siguiente, pero depende de la empresa y mucho se paga informal a
 * los 10 días. Por eso la app avisa y el usuario confirma, en vez de anotar sola.
 */
export function ConfirmIncomeDialog({ source, onClose }: Props) {
  const toast = useToast();
  const { data: accounts } = useAccounts();
  const { data: entries } = useIncomeEntries();
  const mutation = useCreateIncomeEntry();

  // El estado guarda SÓLO lo que el usuario eligió; el default se deriva en cada render. Así la
  // cuenta sugerida aparece igual si los recientes llegan después de abrir el diálogo, sin
  // sincronizar nada en un effect.
  const [chosenAccountId, setChosenAccountId] = useState<string | null>(null);
  const [grossAmount, setGrossAmount] = useState(numberToAmountDisplay(source.expectedAmount ?? 0));
  const [date, setDate] = useState(todayIso());
  const [concept, setConcept] = useState('');

  // Default de cuenta (FR-1): la última usada para ESTA fuente; si no hay, la primera de su
  // moneda (un sueldo en USD no se sugiere en la caja de ARS).
  const lastUsedAccountId = entries?.content.find((e) => e.incomeSourceId === source.sourceId)?.accountId;
  const accountId =
    chosenAccountId ??
    lastUsedAccountId ??
    accounts?.find((a) => a.currency === source.currency)?.id ??
    accounts?.[0]?.id ??
    '';

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate(
      {
        incomeSourceId: source.sourceId,
        accountId,
        grossAmount: parseAmountInput(grossAmount),
        date,
        concept: concept || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success(
            `Ingreso registrado. Nuevo balance: ${formatMoney(data.accountBalance, data.currency)}`,
          );
          onClose();
        },
        onError: (error) => toast.error(incomeErrorMessage(error)),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Confirmar ${source.name}`}
      disableClose={mutation.isPending}
    >
      <form onSubmit={handleSubmit} aria-label="Confirmar ingreso" className="flex flex-col gap-3">
        <p className="text-sm text-body">
          Esperado: {formatMoney(source.expectedAmount, source.currency)}. Corregí el monto si
          entró distinto.
        </p>

        <Select
          label="Cuenta destino"
          id="confirm-account"
          value={accountId}
          onChange={(e) => setChosenAccountId(e.target.value)}
          required
          disabled={mutation.isPending}
        >
          <option value="">Elegí una cuenta</option>
          {accounts?.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </Select>

        <MoneyInput
          label="Monto bruto"
          id="confirm-gross"
          value={grossAmount}
          onValueChange={setGrossAmount}
          required
          disabled={mutation.isPending}
        />

        <DateField
          label="Fecha"
          id="confirm-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          disabled={mutation.isPending}
        />

        <ConceptInput
          id="confirm-concept"
          value={concept}
          onChange={setConcept}
          disabled={mutation.isPending}
        />

        <div className="flex gap-3">
          <Button type="submit" loading={mutation.isPending}>
            Confirmar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
