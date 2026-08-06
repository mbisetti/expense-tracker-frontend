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
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Button } from '../../components/ui/Button';
import { EditButton } from '../../components/ui/ActionsMenu';
import { useToast } from '../../components/ui/toastContext';
import { numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import type { PaymentMethod } from '../paymentMethods/api';
import type { Account, AccountType, LoanInput } from './api';

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
  const [externalUrl, setExternalUrl] = useState(account?.externalUrl ?? '');
  const [linkedAccountId, setLinkedAccountId] = useState(account?.linkedAccountId ?? '');
  const [statementCloseDay, setStatementCloseDay] = useState(
    account?.statementCloseDay != null ? String(account.statementCloseDay) : '',
  );
  const [paymentDueDay, setPaymentDueDay] = useState(
    account?.paymentDueDay != null ? String(account.paymentDueDay) : '',
  );
  // S40 (D5): el plan de pagos del préstamo. Los cuatro primeros son atómicos — el server
  // rechaza media config con INVALID_LOAN_CONFIG y acá se piden juntos con `required`.
  const [loanInstallment, setLoanInstallment] = useState(
    account?.loan ? numberToAmountDisplay(account.loan.installmentAmount) : '',
  );
  const [loanCount, setLoanCount] = useState(
    account?.loan ? String(account.loan.installmentsTotal) : '',
  );
  const [loanDueDay, setLoanDueDay] = useState(account?.loan ? String(account.loan.dueDay) : '');
  const [loanStartedOn, setLoanStartedOn] = useState(account?.loan?.startedOn ?? '');
  const [loanPrincipal, setLoanPrincipal] = useState(
    account?.loan?.principal != null ? numberToAmountDisplay(account.loan.principal) : '',
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

  // S40 (D5): el bloque de préstamo es OPT-IN dentro de DEBT. Una deuda pelada ("le debo a mi
  // viejo") no tiene plan de pagos y no tiene por qué inventar uno; el bloque se abre solo si ya
  // había config cargada.
  const [loanOpen, setLoanOpen] = useState(account?.loan != null);
  const showLoanBlock = type === 'DEBT';

  // Los cuatro juntos o ninguno. Es el mismo invariante que el CHECK de V49 y el guard del
  // service; acá evita mandar un request que ya sabemos que va a fallar.
  const loanFilled = [loanInstallment, loanCount, loanDueDay, loanStartedOn].filter(
    (v) => v.trim() !== '',
  ).length;
  const loanPartial = showLoanBlock && loanOpen && loanFilled > 0 && loanFilled < 4;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loanPartial) return; // guard cliente; el botón ya está deshabilitado
    const normalizedCurrency = currency.trim().toUpperCase();
    const closeDayNum = statementCloseDay === '' ? null : Number(statementCloseDay);
    const dueDayNum = paymentDueDay === '' ? null : Number(paymentDueDay);

    // El plan viaja sólo si está COMPLETO y la cuenta es DEBT. El principal va aparte: cargar
    // sólo "me prestaron 500k" es válido y no configura ningún plan.
    const loanChanges: LoanInput = {};
    if (showLoanBlock && loanOpen && loanFilled === 4) {
      loanChanges.loanInstallmentAmount = parseAmountInput(loanInstallment);
      loanChanges.loanInstallmentsTotal = Number(loanCount);
      loanChanges.loanDueDay = Number(loanDueDay);
      loanChanges.loanStartedOn = loanStartedOn;
    }
    if (showLoanBlock && loanOpen && loanPrincipal.trim() !== '') {
      loanChanges.loanPrincipal = parseAmountInput(loanPrincipal);
    }

    // La agrupación matchea el string EXACTO (buildGroups en AccountsPage), así que un espacio
    // de más al final rompe el grupo sin que se vea nada raro en pantalla. Se trimea al guardar:
    // el helper del campo promete "escribilo igual" y esto lo hace cumplible.
    const normalizedInstitution = institution.trim();

    if (isEdit) {
      const changes: UpdateAccountInput = {};
      if (name !== account.name) changes.name = name;
      if (type !== account.type) changes.type = type;
      if (normalizedCurrency !== account.currency) changes.currency = normalizedCurrency;
      if (isInformal !== account.isInformal) changes.isInformal = isInformal;
      // Institución (D8): "" borra. Sólo se manda si cambió respecto al valor actual.
      if (normalizedInstitution !== (account.institution ?? '')) {
        changes.institution = normalizedInstitution;
      }
      // S42: mismo criterio — "" borra el link, no mandarlo no lo toca.
      if (externalUrl.trim() !== (account.externalUrl ?? '')) {
        changes.externalUrl = externalUrl.trim();
      }
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

      Object.assign(changes, loanChanges);

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
      const input: CreateAccountInput = {
        name, type, currency: normalizedCurrency, isInformal, ...loanChanges,
      };
      if (normalizedInstitution !== '') input.institution = normalizedInstitution;
      if (externalUrl.trim() !== '') input.externalUrl = externalUrl.trim();
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

      {/* S42: el atajo al home banking. Va después de la moneda porque es del mismo tenor que
          la institución: describe DÓNDE vive la cuenta, no cómo se comporta la plata. */}
      <Input
        label="Link al home banking (opcional)"
        id="acc-external-url"
        type="text"
        value={externalUrl}
        onChange={(e) => setExternalUrl(e.target.value)}
        maxLength={500}
        placeholder="bancogalicia.com.ar"
        disabled={isPending}
        helper="Para entrar directo desde la card. Podés escribir sólo el dominio."
      />

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
            helper="Agrupa cuentas hermanas (ej: caja de ahorro + plazo fijo del mismo banco). Se agrupan sólo si está escrito EXACTAMENTE igual en las dos: elegilo de la lista en vez de tipearlo."
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

      {/* S40 (D5): plan de pagos del préstamo. Patrón exacto del bloque condicional de CREDIT,
          pero OPT-IN: una deuda pelada ("le debo a mi viejo") no tiene cuotas y no tiene por qué
          inventarlas. Nada de esto genera movimientos — el préstamo es metadata + derivación
          (D9: los recurrentes no se tocan); las cuotas se cargan como cualquier transferencia. */}
      {showLoanBlock && (
        <div className="flex flex-col gap-3 rounded-md border border-line p-3">
          <label htmlFor="acc-loan-open" className="flex items-center gap-2 text-sm text-ink">
            <input
              id="acc-loan-open"
              type="checkbox"
              checked={loanOpen}
              onChange={(e) => setLoanOpen(e.target.checked)}
              disabled={isPending}
              className="h-5 w-5 rounded-sm border border-line accent-brand"
            />
            Es un préstamo en cuotas
          </label>

          {loanOpen && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <MoneyInput
                  label="Cuota"
                  id="acc-loan-installment"
                  value={loanInstallment}
                  onValueChange={setLoanInstallment}
                  disabled={isPending}
                />
                <Input
                  label="Cantidad de cuotas"
                  id="acc-loan-count"
                  type="number"
                  min={1}
                  value={loanCount}
                  onChange={(e) => setLoanCount(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Día de vencimiento (1-28)"
                  id="acc-loan-due-day"
                  type="number"
                  min={1}
                  max={28}
                  value={loanDueDay}
                  onChange={(e) => setLoanDueDay(e.target.value)}
                  disabled={isPending}
                  helper="Si vence el 29, 30 o 31, poné 28: el aviso llega antes, nunca después."
                />
                <Input
                  label="Fecha de la primera cuota"
                  id="acc-loan-started-on"
                  type="date"
                  value={loanStartedOn}
                  onChange={(e) => setLoanStartedOn(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <MoneyInput
                label="Capital recibido (opcional)"
                id="acc-loan-principal"
                value={loanPrincipal}
                onValueChange={setLoanPrincipal}
                disabled={isPending}
                helper="Lo que te dieron. Sirve para ver cuánto te cuesta el préstamo."
              />

              {loanPartial && (
                <p role="alert" className="text-sm text-expense">
                  Completá los cuatro datos del préstamo juntos: cuota, cantidad, día de
                  vencimiento y fecha de la primera cuota.
                </p>
              )}

              <p className="text-xs text-muted">
                Esto no anota cuotas solo: las vas registrando como transferencias hacia esta
                cuenta, y el progreso se mide contra la plata que pagaste.
              </p>
            </>
          )}
        </div>
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
        <Button type="submit" loading={isPending} disabled={loanPartial}>
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
