import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { CurrencySelect } from '../../components/ui/CurrencySelect';
import { DateField } from '../../components/ui/DateField';
import { Button } from '../../components/ui/Button';
import { parseAmountInput } from '../../lib/money';
import { currencyOptionsFor } from '../../lib/currencyOptions';
import { useMe } from '../auth/useMe';
import { useCategories } from '../categories/useCategories';
import { useAccounts } from '../accounts/useAccounts';
import { usePeople } from './useShared';
import type { PersonDebtInput } from './api';

const NEW_PERSON = '__new_person__';

type PersonDebtFormProps = {
  open: boolean;
  loading?: boolean;
  onConfirm: (input: PersonDebtInput) => void;
  onCancel: () => void;
};

function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// "Bauti pagó la cena por mí" (S40 D7).
//
// Pide lo mismo que un gasto —monto, fecha, categoría, descripción— porque ESO es: un gasto
// tuyo. La única diferencia con el alta normal es que no se elige cuenta: va siempre a "Deudas
// con amigos", que la app crea sola la primera vez.
export function PersonDebtForm({ open, loading, onConfirm, onCancel }: PersonDebtFormProps) {
  const [personId, setPersonId] = useState('');
  const [newName, setNewName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');

  const { data: me } = useMe();
  const { data: people } = usePeople();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  // Monedas ofrecidas: las de la cuenta sistema si ya existe, más las configuradas en Ajustes.
  // Antes de la primera deuda la cuenta no existe y la lista sale de la favorita + Ajustes.
  const systemAccount = (accounts ?? []).find((a) => a.systemRole === 'FRIEND_DEBTS');
  const currencyOptions = currencyOptionsFor(
    systemAccount,
    me?.workingCurrencies,
    me?.defaultCurrency,
  );
  const resolvedCurrency = currency || currencyOptions[0] || '';

  const expenseCategories = (categories ?? []).filter((c) => c.type !== 'INCOME');
  const parsedAmount = parseAmountInput(amount);
  const creatingPerson = personId === NEW_PERSON;
  const canSubmit =
    parsedAmount > 0 && (creatingPerson ? newName.trim().length > 0 : personId.length > 0);

  const submit = () => {
    if (!canSubmit) return;
    const base: PersonDebtInput = {
      amount: parsedAmount,
      currency: resolvedCurrency || undefined,
      date: date || undefined,
      categoryId: categoryId || undefined,
      description: description.trim() || undefined,
    };
    // El alta al vuelo es idempotente por nombre en el backend: tipear "bauti" teniendo "Bauti"
    // devuelve a Bauti. Por eso el nombre puede viajar directo, sin crear la persona antes.
    onConfirm(creatingPerson ? { ...base, personName: newName.trim() } : { ...base, personId });
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Anotar una deuda"
      footer={
        <div className="flex gap-3">
          <Button type="button" onClick={submit} loading={loading} disabled={!canSubmit}>
            Anotar
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-body">Alguien pagó algo por vos y se lo tenés que devolver.</p>

        <Select
          label="¿Quién pagó?"
          id="debt-person"
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          required
          disabled={loading}
        >
          <option value="">Elegí una persona</option>
          {(people ?? []).map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
          <option value={NEW_PERSON}>+ Nueva persona…</option>
        </Select>

        {creatingPerson && (
          <Input
            label="Nombre"
            id="debt-new-person"
            type="text"
            maxLength={100}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Bauti"
            disabled={loading}
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <MoneyInput
            label="¿Cuánto?"
            id="debt-amount"
            value={amount}
            onValueChange={setAmount}
            required
            disabled={loading}
            helper="Anotá solo tu parte."
          />
          <CurrencySelect
            id="debt-currency"
            label="Moneda"
            options={currencyOptions}
            value={resolvedCurrency}
            onChange={setCurrency}
            disabled={loading}
          />
        </div>

        <DateField
          label="¿Cuándo fue?"
          id="debt-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          disabled={loading}
        />

        <Select
          label="Categoría (opcional)"
          id="debt-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={loading}
        >
          <option value="">Sin categoría</option>
          {expenseCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        <Input
          label="¿Qué fue?"
          id="debt-description"
          type="text"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Cena parrilla"
          disabled={loading}
        />

        <p className="text-xs text-muted">
          Cuenta como gasto tuyo el día que pasó, con su categoría. Cuando le devuelvas la plata
          se registra como transferencia y el mes no se mueve otra vez.
        </p>
      </div>
    </Modal>
  );
}
