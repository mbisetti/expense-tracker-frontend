import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { AccountForm } from '../accounts/AccountForm';
import { TYPE_LABELS } from '../accounts/typeLabels';
import { StepIntro } from './StepIntro';
import type { Account } from '../accounts/api';

type StepAccountsProps = {
  accounts: Account[];
  isPending: boolean;
};

// Paso 2. Alta repetida reusando el AccountForm de siempre en un modal: el usuario aprende el
// formulario que va a volver a ver en Cuentas, y acá no se mantiene una segunda versión del alta.
export function StepAccounts({ accounts, isPending }: StepAccountsProps) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <StepIntro
        title="Tus cuentas"
        lines={[
          'Una cuenta es cada lugar donde tenés plata: el banco, la billetera virtual, el efectivo.',
          'Cargá las que uses de verdad. Siempre podés agregar más después.',
        ]}
      />

      {isPending && <Skeleton variant="list" rows={2} />}

      {!isPending && accounts.length === 0 && (
        <p className="text-sm text-muted">Todavía no cargaste ninguna cuenta.</p>
      )}

      {accounts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {accounts.map((account) => (
            <li key={account.id}>
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink">{account.name}</span>
                  <span className="text-sm text-muted">
                    {TYPE_LABELS[account.type]} · {account.currency}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => setFormOpen(true)}
      >
        Agregar cuenta
      </Button>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nueva cuenta">
        <AccountForm accounts={accounts} onClose={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
