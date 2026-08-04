import { useState, type FormEvent } from 'react';
import {
  useCreateAccount,
  useUpdateAccount,
  type CreateAccountInput,
  type UpdateAccountInput,
} from './useAccountMutations';
import { accountErrorMessage } from './errorMessages';
import { TYPE_LABELS } from './typeLabels';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { EditButton } from '../../components/ui/ActionsMenu';
import { useToast } from '../../components/ui/toastContext';
import type { PaymentMethod } from '../paymentMethods/api';
import type { Account, AccountType } from './api';

// Alta: 5 activos + Deuda. "Tarjeta de crédito" NO está (nace desde el bloque, D9).
const CREATE_TYPES: AccountType[] = ['CASH', 'BANK', 'WALLET', 'INVESTMENT', 'CRYPTO', 'DEBT'];
// Edición: además CREDIT (permite conversión, con los guards del backend).
const EDIT_TYPES: AccountType[] = [...CREATE_TYPES, 'CREDIT'];

type ManageCards = {
  debitPms: PaymentMethod[];
  creditChildren: Account[];
  onAddCard: () => void;
  onEditChild: (child: Account) => void;
  onEditDebit: (pm: PaymentMethod) => void;
};

type AccountFormProps = {
  account?: Account;
  /** Todas las cuentas: alimenta el datalist de institución y el selector "Vinculada a". */
  accounts?: Account[];
  /** Gestión de tarjetas del bloque (sólo en edición de BANK/WALLET). */
  manageCards?: ManageCards;
  onClose: () => void;
  /** En edición: dispara el borrado (con confirmación en la página). */
  onDelete?: () => void;
};

export function AccountForm({ account, accounts, manageCards, onClose, onDelete }: AccountFormProps) {
  const isEdit = account !== undefined;
  const toast = useToast();

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'BANK');
  const [currency, setCurrency] = useState(account?.currency ?? 'ARS');
  const [isInformal, setIsInformal] = useState(account?.isInformal ?? false);
  const [institution, setInstitution] = useState(account?.institution ?? '');
  const [linkedAccountId, setLinkedAccountId] = useState(account?.linkedAccountId ?? '');
  const [statementCloseDay, setStatementCloseDay] = useState(
    account?.statementCloseDay != null ? String(account.statementCloseDay) : '',
  );
  const [paymentDueDay, setPaymentDueDay] = useState(
    account?.paymentDueDay != null ? String(account.paymentDueDay) : '',
  );

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const mutation = isEdit ? updateMutation : createMutation;

  const typeOptions = isEdit ? EDIT_TYPES : CREATE_TYPES;
  // (a) Una CREDIT con ciclo no puede convertirse hoy (applyStatementConfig + CHECKs V22 la
  //     rechazan): el selector de tipo va deshabilitado con hint (no ofrecer un camino que
  //     siempre falla).
  const typeLocked = isEdit && account.type === 'CREDIT' && account.statementCloseDay != null;
  const isLinkedCard = type === 'CREDIT' && linkedAccountId !== '';
  // Institución oculta en tarjetas vinculadas: la agrupación la da el vínculo, no la institución.
  const showInstitution = !isLinkedCard;

  // Cuentas madre elegibles para "Vinculada a": BANK/WALLET (nunca la propia cuenta).
  const parentOptions = (accounts ?? []).filter(
    (a) => (a.type === 'BANK' || a.type === 'WALLET') && a.id !== account?.id,
  );
  // Instituciones ya usadas (datalist): reduce typos en el matching exacto (D4).
  const institutionOptions = Array.from(
    new Set((accounts ?? []).map((a) => a.institution).filter((i): i is string => !!i)),
  );

  const isBankLike = type === 'BANK' || type === 'WALLET';

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedCurrency = currency.trim().toUpperCase();
    const closeDayNum = statementCloseDay === '' ? null : Number(statementCloseDay);
    const dueDayNum = paymentDueDay === '' ? null : Number(paymentDueDay);

    if (isEdit) {
      const changes: UpdateAccountInput = {};
      if (name !== account.name) changes.name = name;
      if (type !== account.type) changes.type = type;
      if (normalizedCurrency !== account.currency) changes.currency = normalizedCurrency;
      if (isInformal !== account.isInformal) changes.isInformal = isInformal;
      // Institución (D8): "" borra. Sólo se manda si cambió respecto al valor actual.
      if (institution !== (account.institution ?? '')) changes.institution = institution;
      // Vínculo (D8): sólo relevante para CREDIT; "" desvincula. Al convertir fuera de CREDIT
      // el backend limpia el link solo → no hace falta mandarlo.
      if (type === 'CREDIT' && linkedAccountId !== (account.linkedAccountId ?? '')) {
        changes.linkedAccountId = linkedAccountId;
      }

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
      if (institution.trim() !== '') input.institution = institution;
      // El alta no ofrece CREDIT (D9) → sin ciclo ni vínculo por este camino.
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
        disabled={isPending || typeLocked}
        helper={
          typeLocked
            ? 'Una tarjeta de crédito con ciclo no se puede convertir a otro tipo.'
            : undefined
        }
      >
        {typeOptions.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABELS[t]}
          </option>
        ))}
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

      {/* "Vinculada a" (D2): sólo en CREDIT. Permite plegar las tarjetas existentes bajo su
          banco/billetera. "— ninguna —" (value "") desvincula (D8). */}
      {type === 'CREDIT' && (
        <Select
          label="Vinculada a"
          id="acc-linked"
          value={linkedAccountId}
          onChange={(e) => setLinkedAccountId(e.target.value)}
          disabled={isPending}
        >
          <option value="">— ninguna —</option>
          {parentOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </Select>
      )}

      {showInstitution && (
        <>
          <Input
            label="Institución (opcional)"
            id="acc-institution"
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            maxLength={100}
            list="acc-institution-list"
            disabled={isPending}
            helper="Agrupa cuentas hermanas (ej: caja de ahorro + plazo fijo del mismo banco)."
          />
          <datalist id="acc-institution-list">
            {institutionOptions.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </>
      )}

      {type === 'CREDIT' && (
        <>
          {/* required para CREDIT: fuerza el par completo (o los dos o ninguno). */}
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
        Cuenta informal (fuera del sistema bancario)
      </label>

      {/* Gestión de tarjetas del bloque (D9): sólo en edición de BANK/WALLET. */}
      {isEdit && isBankLike && manageCards && (
        <div className="flex flex-col gap-2 rounded-md border border-line p-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Tarjetas</span>
          {manageCards.debitPms.length === 0 && manageCards.creditChildren.length === 0 ? (
            <p className="text-sm text-muted">Todavía no tenés tarjetas en esta cuenta.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {manageCards.debitPms.map((pm) => (
                <li key={pm.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-body">
                    {pm.name} · {pm.type === 'DEBIT' ? 'Débito' : 'Crédito'}
                  </span>
                  <EditButton label={pm.name} onClick={() => manageCards.onEditDebit(pm)} />
                </li>
              ))}
              {manageCards.creditChildren.map((child) => (
                <li key={child.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-ink">{child.name} · Crédito</span>
                  <EditButton label={child.name} onClick={() => manageCards.onEditChild(child)} />
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={manageCards.onAddCard}
            disabled={isPending}
            className="self-start"
          >
            Agregar tarjeta
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isPending}>
          Guardar
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isPending}
        >
          Cancelar
        </Button>
        {isEdit && onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isPending}
            className="ml-auto border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
          >
            Borrar
          </Button>
        )}
      </div>
    </form>
  );
}
