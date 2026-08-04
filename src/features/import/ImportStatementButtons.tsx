import { useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { useAccounts } from '../accounts/useAccounts';
import { useToast } from '../../components/ui/toastContext';
import { statementErrorMessage } from './errorMessages';
import { StatementPreviewModal } from './StatementPreviewModal';
import { useStatementConfirm, useStatementPreview, type StatementUpload } from './useStatementImport';
import type { StatementReport, StatementSourceKind } from './statementApi';
import type { Account } from '../accounts/api';

// S37 §7 — las dos puertas de entrada, en Transacciones, que es donde vive el feed que van a
// llenar. El historial de imports y el deshacer siguen viviendo en /datos.
//
// D15: la cuenta se elige ANTES de abrir el selector de archivo. No es un dato de destino nada
// más: se le manda al modelo como anclaje y después se cruza contra lo que dice el archivo.
// El botón de elegir archivo no se habilita sin cuenta.

const ASSET_TYPES = ['CASH', 'BANK', 'WALLET', 'INVESTMENT', 'CRYPTO'];

const KIND_LABEL: Record<StatementSourceKind, string> = {
  ACCOUNT_STATEMENT: 'Importar extracto',
  CARD_STATEMENT: 'Importar resumen de tarjeta',
};

const KIND_HELP: Record<StatementSourceKind, string> = {
  ACCOUNT_STATEMENT: 'El PDF del extracto de tu cuenta o billetera.',
  CARD_STATEMENT: 'El PDF del resumen de tu tarjeta de crédito.',
};

function eligible(accounts: Account[], kind: StatementSourceKind): Account[] {
  return kind === 'CARD_STATEMENT'
    ? accounts.filter((account) => account.type === 'CREDIT')
    : accounts.filter((account) => ASSET_TYPES.includes(account.type));
}

export function ImportStatementButtons() {
  const [kind, setKind] = useState<StatementSourceKind | null>(null);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setKind('ACCOUNT_STATEMENT')}>
        Importar extracto
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => setKind('CARD_STATEMENT')}>
        Importar resumen
      </Button>
      {kind && <StatementUploadFlow kind={kind} onClose={() => setKind(null)} />}
    </>
  );
}

function StatementUploadFlow({ kind, onClose }: { kind: StatementSourceKind; onClose: () => void }) {
  const { data: accounts } = useAccounts();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [upload, setUpload] = useState<StatementUpload | null>(null);
  const [report, setReport] = useState<StatementReport | null>(null);

  const preview = useStatementPreview();
  const confirm = useStatementConfirm();

  const options = eligible(accounts ?? [], kind);

  const pick = (file: File | undefined) => {
    if (!file || !accountId) return;
    const input: StatementUpload = { kind, file, accountId, password: password || undefined };
    setUpload(input);
    preview.mutate(input, {
      onSuccess: setReport,
      onError: (error) => toast.error(statementErrorMessage(error)),
    });
  };

  const close = () => {
    setReport(null);
    setUpload(null);
    onClose();
  };

  if (report && upload) {
    return (
      <StatementPreviewModal
        open
        report={report}
        upload={upload}
        onClose={close}
        onConfirm={(payload) =>
          confirm.mutate(
            { upload, payload },
            {
              onSuccess: (result) => {
                toast.success(
                  `Importado: ${result.imported} ${result.imported === 1 ? 'movimiento' : 'movimientos'}`,
                );
                close();
              },
              onError: (error) => toast.error(statementErrorMessage(error)),
            },
          )
        }
        isImporting={confirm.isPending}
      />
    );
  }

  return (
    <Modal open onClose={close} title={KIND_LABEL[kind]} disableClose={preview.isPending}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">{KIND_HELP[kind]}</p>

        {options.length === 0 ? (
          <p className="text-sm text-expense">
            {kind === 'CARD_STATEMENT'
              ? 'Todavía no tenés ninguna tarjeta de crédito cargada.'
              : 'Todavía no tenés ninguna cuenta de activo cargada.'}
          </p>
        ) : (
          <>
            <Select
              label={kind === 'CARD_STATEMENT' ? 'Tarjeta' : 'Cuenta'}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              helper="Se elige primero para poder avisarte si el archivo es de otra cuenta."
            >
              <option value="">Elegí una…</option>
              {options.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>

            <Input
              label="Contraseña del PDF (si tiene)"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helper="Sólo se usa para abrir el archivo. No se guarda."
            />

            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <Button
              type="button"
              disabled={!accountId}
              loading={preview.isPending}
              onClick={() => fileInput.current?.click()}
            >
              Elegir el PDF
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
