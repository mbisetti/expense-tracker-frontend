import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { CheckCircleIcon } from '../../components/ui/icons';
import { useToast } from '../../components/ui/toastContext';
import { parseAmountInput } from '../../lib/money';
import { useAdjustAccountValue } from '../accounts/useAccountPerformance';
import { accountErrorMessage } from '../accounts/errorMessages';
import { StepIntro } from './StepIntro';
import type { Account } from '../accounts/api';

type StepBalancesProps = {
  accounts: Account[];
};

/**
 * Paso 3 — "¿cuánto tenés hoy?".
 *
 * Va ANTES del primer gasto a propósito: el guard INSUFFICIENT_BALANCE rebota cualquier gasto
 * contra una cuenta en cero, así que un wizard que pidiera los gastos primero rebotaría todo.
 *
 * Cada fila es un PUT /accounts/{id}/value, el mismo ajuste de S40 que S46 abrió a las cuentas
 * comunes (D5). Entra al balance y no cuenta como ingreso del mes: decir cuánta plata tenés no
 * es haber cobrado.
 */
export function StepBalances({ accounts }: StepBalancesProps) {
  // Sólo cuentas de activo del usuario. La tarjeta no se ajusta (su saldo es el resumen del
  // ciclo), la deuda se carga desde su propia card con el plan de pagos, y "Deudas con amigos"
  // es una cuenta que creó la app y no tiene un saldo que el usuario sepa.
  const adjustable = accounts.filter(
    (a) =>
      a.systemRole !== 'FRIEND_DEBTS' &&
      (a.type === 'CASH' || a.type === 'BANK' || a.type === 'WALLET'),
  );

  return (
    <div className="flex flex-col gap-4">
      <StepIntro
        title="¿Cuánto tenés hoy?"
        lines={[
          'Decinos cuánto hay hoy en cada cuenta y arrancamos de ahí.',
          'No cuenta como ingreso del mes: es el punto de partida, no plata que entró.',
        ]}
      />

      {adjustable.length === 0 && (
        <p className="text-sm text-muted">
          No cargaste ninguna cuenta de efectivo, banco o billetera. Podés volver al paso
          anterior y agregar una.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {adjustable.map((account) => (
          <li key={account.id}>
            <BalanceRow account={account} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function BalanceRow({ account }: { account: Account }) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);
  const adjust = useAdjustAccountValue();
  const toast = useToast();

  const save = () => {
    adjust.mutate(
      { accountId: account.id, input: { currency: account.currency, currentValue: parseAmountInput(value) } },
      {
        onSuccess: () => setSaved(true),
        onError: (error) => toast.error(accountErrorMessage(error)),
      },
    );
  };

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <MoneyInput
            label={account.name}
            id={`onboarding-balance-${account.id}`}
            value={value}
            onValueChange={(next) => {
              setValue(next);
              setSaved(false);
            }}
            helper={`En ${account.currency}`}
            disabled={adjust.isPending}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={save}
          loading={adjust.isPending}
          disabled={value.trim() === ''}
        >
          Guardar
        </Button>
        {/* La confirmación es de la FILA y no un toast: son varias cuentas seguidas y hace
            falta ver de un vistazo cuáles ya quedaron cargadas. */}
        {saved && (
          <span className="flex items-center gap-1 text-sm text-income">
            <CheckCircleIcon className="h-4 w-4" />
            Guardado
          </span>
        )}
      </div>
    </Card>
  );
}
