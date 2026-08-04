import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { formatMoney } from '../../lib/money';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import { usePeople } from '../shared/useShared';
import { useAccounts } from '../accounts/useAccounts';
import { useCategories } from '../categories/useCategories';
import { usePaymentMethods } from '../paymentMethods/usePaymentMethods';
import type { Account } from '../accounts/api';
import type { Category } from '../categories/api';
import type { PaymentMethod } from '../paymentMethods/api';
import { allRows } from './statementApi';
import type {
  HolderMode,
  NameLink,
  RowDecision,
  StatementConfirmPayload,
  StatementReport,
  StatementRowResult,
} from './statementApi';
import type { StatementUpload } from './useStatementImport';

// S37 §7 — el preview de un resumen. Hermano del ImportPreviewModal de S28, no reemplazo.
//
// Todo lo que este modal hace toca plata, así que todo se pre-confirma: nada entra sin que el
// usuario lo vea primero. De arriba hacia abajo, en orden de qué necesita una decisión:
//
//   1. Qué se leyó, en castellano (D15) y el aviso si el archivo no es de esta cuenta.
//   2. Las cuentas: cierran o no, con el desvío exacto en plata (D4).
//   3. Los nombres nuevos, que son las únicas filas que piden una decisión real (D14).
//   4. Los titulares y sus interruptores (D5).
//   5. El próximo ciclo (D10).
//   6. Las filas, por sección, con checkbox por fila y por sección (D12).

type Props = {
  open: boolean;
  report: StatementReport;
  upload: StatementUpload;
  onClose: () => void;
  onConfirm: (payload: StatementConfirmPayload) => void;
  isImporting: boolean;
};

type NameChoice = { personId: string | null; createName: string; decided: boolean };

/** Lo que se puede cambiar en la planilla. Nada de esto toca la aritmética del resumen. */
type RowEdit = { description?: string; categoryId?: string | null; paymentMethodId?: string | null };

const MODE_LABEL: Record<HolderMode, string> = {
  OWN: 'Lo banco yo',
  REIMBURSED: 'Me lo devuelve',
  IGNORED: 'Ignorar',
};

export function StatementPreviewModal({
  open,
  report,
  upload,
  onClose,
  onConfirm,
  isImporting,
}: Props) {
  const { pref } = useDateFormat();
  const { data: people } = usePeople();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  // Los métodos de la cuenta elegida: una tarjeta no tiene (la tarjeta ES el método), así que
  // en un resumen la columna queda vacía sola, sin un caso especial.
  const { data: paymentMethods } = usePaymentMethods(upload.accountId);

  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allRows(report).map((row) => [row.id, row.selected])),
  );
  // D8: la cuenta con la que se empareja una transferencia entre cuentas propias. El server la
  // propone; el usuario la puede cambiar o sacar, porque emparejar contra la cuenta equivocada
  // mueve plata de un lado al otro sin que se note.
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      allRows(report)
        .filter((row) => row.ownTransferAccountId)
        .map((row) => [row.id, row.ownTransferAccountId as string]),
    ),
  );

  // S38: lo editado en la planilla, por fila. Sólo campos de CLASIFICACIÓN — descripción,
  // categoría y método. El monto y la fecha no se tocan: la validación de que el resumen cierra
  // se calcula contra ellos, así que editarlos rompería en silencio la red que avisa si leí mal.
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const edit = (id: string, patch: RowEdit) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const [modes, setModes] = useState<Record<string, HolderMode>>(() =>
    Object.fromEntries(report.holders.map((holder) => [holder.key, holder.mode])),
  );
  const [names, setNames] = useState<Record<string, NameChoice>>(() =>
    Object.fromEntries(
      report.pendingNames.map((pending) => [
        pending.rawAlias,
        { personId: pending.suggestedPersonId, createName: pending.rawAlias, decided: false },
      ]),
    ),
  );
  const [updateCycle, setUpdateCycle] = useState(report.cycle?.updatable ?? false);
  const [force, setForce] = useState(false);
  const [confirmMismatch, setConfirmMismatch] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(report.sections.map((section) => [section.key, section.selectedByDefault])),
  );

  const rows = useMemo(() => allRows(report), [report]);
  const selectedCount = rows.filter((row) => selected[row.id] && row.status !== 'ERROR').length;

  // Los tres guards que pueden frenar el import, cada uno con su salida explícita.
  const blockingCheck = report.checks.some((check) => !check.ok && !check.documentInconsistency);
  const pendingNames = report.pendingNames.filter((pending) => !names[pending.rawAlias]?.decided);
  const needsMismatchConfirm = report.accountMatch === 'MISMATCH' && !confirmMismatch;
  const canImport =
    selectedCount > 0 &&
    pendingNames.length === 0 &&
    !needsMismatchConfirm &&
    (!blockingCheck || force);

  const submit = () => {
    const decisions: RowDecision[] = rows.map((row) => ({
      id: row.id,
      selected: Boolean(selected[row.id]) && row.status !== 'ERROR',
      date: row.date,
      // Lo editado gana sobre lo que leyó el server: es exactamente lo que el usuario aprobó.
      description: edits[row.id]?.description ?? row.description,
      amount: row.amount,
      currency: row.currency,
      type: row.type,
      section: row.section,
      categoryId:
        edits[row.id]?.categoryId !== undefined
          ? (edits[row.id]!.categoryId ?? null)
          : row.categoryId,
      paymentMethodId:
        edits[row.id]?.paymentMethodId !== undefined
          ? (edits[row.id]!.paymentMethodId ?? null)
          : row.paymentMethodId,
      personId: row.personId,
      holderKey: row.holderKey,
      installmentNumber: row.installmentNumber,
      installmentTotal: row.installmentTotal,
      originalDate: row.originalDate,
      externalRef: row.externalRef,
      sharedAmount: row.sharedAmount,
      settlesShareId: null,
      ownTransferAccountId: transferTargets[row.id] || null,
    }));

    const nameLinks: NameLink[] = report.pendingNames.map((pending) => {
      const choice = names[pending.rawAlias];
      return {
        rawAlias: pending.rawAlias,
        personId: choice?.personId ?? null,
        createName: choice?.personId ? null : choice?.createName || null,
      };
    });

    onConfirm({
      accountId: upload.accountId,
      sourceKind: report.sourceKind,
      periodStart: report.detected.periodStart,
      periodEnd: report.detected.periodEnd,
      forceMismatch: force,
      confirmAccountMismatch: confirmMismatch,
      updateCycle,
      holders: report.holders.map((holder) => ({
        key: holder.key,
        mode: modes[holder.key] ?? 'OWN',
        personId: holder.personId,
      })),
      nameLinks,
      rows: decisions,
    });
  };

  const footer = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onClose} disabled={isImporting}>
        Cancelar
      </Button>
      <Button type="button" onClick={submit} disabled={!canImport} loading={isImporting}>
        Importar {selectedCount} {selectedCount === 1 ? 'movimiento' : 'movimientos'}
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Revisar el resumen"
      footer={footer}
      disableClose={isImporting}
      // S38: usa la pantalla que haya. Con el ancho de un formulario se perdía la mitad de la
      // información y acomodar 40 renglones era tedioso justo cuando hay lugar de sobra.
      size="wide"
    >
      <div className="flex flex-col gap-4">
        {/* 1 · D15: qué se leyó, antes de cualquier tabla. */}
        <p className="text-sm">{report.summary}</p>

        {report.accountMatch !== 'MATCH' && (
          <div className="rounded-sm border border-warning/40 bg-warning/10 p-3 text-sm">
            <p className="font-medium text-warning">Revisá de qué cuenta es este archivo</p>
            <p className="mt-1 text-muted">{report.accountMatchMessage}</p>
            {report.accountMatch === 'MISMATCH' && (
              <div className="mt-2">
                <Switch
                  id="confirm-mismatch"
                  checked={confirmMismatch}
                  onChange={setConfirmMismatch}
                  label="Ya lo revisé: el archivo es de esta cuenta"
                />
              </div>
            )}
          </div>
        )}

        {/* 2 · D4: las cuentas, una línea por moneda. */}
        <ChecksBar report={report} />

        {blockingCheck && (
          <Switch
            id="force-mismatch"
            checked={force}
            onChange={setForce}
            label="Importar igual, revisé las filas"
          />
        )}

        {/* 3 · D14: los nombres que piden una decisión, arriba de todo. */}
        {report.pendingNames.length > 0 && (
          <section className="rounded-sm border border-line p-3">
            <h3 className="text-sm font-medium">
              Nombres nuevos ({report.pendingNames.length})
            </h3>
            <p className="mt-1 text-xs text-muted">
              Se pregunta una sola vez. La próxima el import ya sabe quién es.
            </p>
            <div className="mt-2 flex flex-col gap-3">
              {report.pendingNames.map((pending) => {
                const choice = names[pending.rawAlias];
                return (
                  <div key={pending.rawAlias} className="flex flex-col gap-2">
                    <p className="text-sm">
                      <span className="font-medium">{pending.rawAlias}</span>
                      <span className="text-muted">
                        {' · '}
                        {pending.rowCount}{' '}
                        {pending.rowCount === 1 ? 'movimiento' : 'movimientos'}
                        {pending.totals.map((total) => (
                          <span key={total.currency}>
                            {' · '}
                            {formatMoney(total.amount, total.currency)}
                          </span>
                        ))}
                      </span>
                    </p>
                    <div className="flex flex-wrap items-end gap-2">
                      <Select
                        label="Es"
                        value={choice?.personId ?? ''}
                        onChange={(e) =>
                          setNames((prev) => ({
                            ...prev,
                            [pending.rawAlias]: {
                              personId: e.target.value || null,
                              createName: prev[pending.rawAlias]?.createName ?? pending.rawAlias,
                              decided: Boolean(e.target.value),
                            },
                          }))
                        }
                      >
                        <option value="">Elegí…</option>
                        {(people ?? []).map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </Select>
                      {!choice?.personId && (
                        <>
                          <Input
                            label="O crear con este nombre"
                            value={choice?.createName ?? ''}
                            onChange={(e) =>
                              setNames((prev) => ({
                                ...prev,
                                [pending.rawAlias]: {
                                  personId: null,
                                  createName: e.target.value,
                                  decided: false,
                                },
                              }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setNames((prev) => ({
                                ...prev,
                                [pending.rawAlias]: {
                                  personId: null,
                                  createName: prev[pending.rawAlias]?.createName ?? pending.rawAlias,
                                  decided: true,
                                },
                              }))
                            }
                          >
                            Crear
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setNames((prev) => ({
                                ...prev,
                                [pending.rawAlias]: {
                                  personId: null,
                                  createName: '',
                                  decided: true,
                                },
                              }))
                            }
                          >
                            No es una persona
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 4 · D5: los titulares y qué hacer con lo suyo. */}
        {report.holders.length > 0 && (
          <section className="rounded-sm border border-line p-3">
            <h3 className="text-sm font-medium">Titulares</h3>
            <div className="mt-2 flex flex-col gap-2">
              {report.holders.map((holder) => (
                <div key={holder.key} className="flex flex-wrap items-end justify-between gap-2">
                  <p className="text-sm">
                    {holder.name}
                    {holder.cardLast4 && <span className="text-muted"> ····{holder.cardLast4}</span>}
                    {holder.totals.map((total) => (
                      <span key={total.currency} className="text-muted">
                        {' · '}
                        {formatMoney(total.amount, total.currency)}
                      </span>
                    ))}
                  </p>
                  <Select
                    label="Sus consumos"
                    value={modes[holder.key] ?? 'OWN'}
                    onChange={(e) =>
                      setModes((prev) => ({ ...prev, [holder.key]: e.target.value as HolderMode }))
                    }
                  >
                    {(['OWN', 'REIMBURSED', 'IGNORED'] as HolderMode[]).map((mode) => (
                      <option key={mode} value={mode}>
                        {MODE_LABEL[mode]}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5 · D10: el resumen es la fuente de verdad del próximo ciclo. */}
        {report.cycle && <CycleBlock cycle={report.cycle} checked={updateCycle} onChange={setUpdateCycle} pref={pref} />}

        {report.directDebit && (
          <p className="text-sm text-muted">
            El banco va a debitar de {report.directDebit.accountLabel}
            {report.directDebit.amounts.map((amount) => (
              <span key={amount.currency}>{` · ${formatMoney(amount.amount, amount.currency)}`}</span>
            ))}
          </p>
        )}

        {/* 6 · Las filas, por sección. */}
        {report.sections.map((section) => (
          <section key={section.key} className="rounded-sm border border-line">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
              onClick={() =>
                setOpenSections((prev) => ({ ...prev, [section.key]: !prev[section.key] }))
              }
            >
              <span>
                {section.label} ({section.rows.length})
              </span>
              <span className="text-muted">{openSections[section.key] ? 'Ocultar' : 'Ver'}</span>
            </button>
            {section.note && <p className="px-3 pb-2 text-xs text-muted">{section.note}</p>}
            {openSections[section.key] && (
              // La planilla scrollea sola, en los dos ejes: con seis columnas en mobile la fila
              // no entra, y romperla en varias líneas es justamente lo que hacía perder la info.
              <div className="max-h-[55vh] overflow-auto border-t border-line">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="sticky top-0 z-10 bg-surface text-left text-xs text-muted">
                    <tr>
                      <th className="w-8 px-2 py-1.5 font-medium"> </th>
                      <th className="w-24 px-2 py-1.5 font-medium">Fecha</th>
                      <th className="px-2 py-1.5 font-medium">Descripción</th>
                      <th className="w-44 px-2 py-1.5 font-medium">Categoría</th>
                      <th className="w-44 px-2 py-1.5 font-medium">Método</th>
                      <th className="w-32 px-2 py-1.5 text-right font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {section.rows.map((row) => (
                      <Row
                        key={row.id}
                        row={row}
                        pref={pref}
                        checked={Boolean(selected[row.id])}
                        onToggle={() =>
                          setSelected((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                        }
                        accounts={accounts ?? []}
                        categories={categories ?? []}
                        paymentMethods={paymentMethods ?? []}
                        rowEdit={edits[row.id]}
                        onEdit={(patch) => edit(row.id, patch)}
                        transferTarget={transferTargets[row.id] ?? ''}
                        onTransferTarget={(value) =>
                          setTransferTargets((prev) => ({ ...prev, [row.id]: value }))
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </Modal>
  );
}

function ChecksBar({ report }: { report: StatementReport }) {
  if (report.checks.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {report.checks.map((check) => (
        <p
          key={check.currency}
          className={`rounded-sm px-3 py-2 text-sm ${
            check.ok
              ? 'bg-income/10 text-income'
              : check.documentInconsistency
                ? 'bg-warning/10 text-warning'
                : 'bg-expense/10 text-expense'
          }`}
        >
          {check.message}
        </p>
      ))}
    </div>
  );
}

function CycleBlock({
  cycle,
  checked,
  onChange,
  pref,
}: {
  cycle: NonNullable<StatementReport['cycle']>;
  checked: boolean;
  onChange: (value: boolean) => void;
  pref: 'ar' | 'us';
}) {
  return (
    <section className="rounded-sm border border-line p-3">
      <h3 className="text-sm font-medium">Próximo ciclo</h3>
      <ul className="mt-1 flex flex-col gap-0.5 text-sm text-muted">
        {cycle.nextCloseDate && <li>Próximo cierre: {formatDate(cycle.nextCloseDate, pref)}</li>}
        {cycle.nextDueDate && <li>Próximo vencimiento: {formatDate(cycle.nextDueDate, pref)}</li>}
        {cycle.currentCloseDay !== null && (
          <li>
            Hoy tu tarjeta cierra el {cycle.currentCloseDay} y vence el {cycle.currentDueDay}.
          </li>
        )}
      </ul>
      {cycle.updatable ? (
        <div className="mt-2">
          <Switch
            id="update-cycle"
            checked={checked}
            onChange={onChange}
            label={`Actualizar el ciclo a cierre ${cycle.proposedCloseDay} y vencimiento ${cycle.proposedDueDay}`}
          />
        </div>
      ) : (
        cycle.note && <p className="mt-2 text-xs text-muted">{cycle.note}</p>
      )}
    </section>
  );
}

function Row({
  row,
  pref,
  checked,
  onToggle,
  accounts,
  categories,
  paymentMethods,
  rowEdit,
  onEdit,
  transferTarget,
  onTransferTarget,
}: {
  row: StatementRowResult;
  pref: 'ar' | 'us';
  checked: boolean;
  onToggle: () => void;
  accounts: Account[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  rowEdit: RowEdit | undefined;
  onEdit: (patch: RowEdit) => void;
  transferTarget: string;
  onTransferTarget: (value: string) => void;
}) {
  const amount =
    row.amount !== null && row.currency ? formatMoney(row.amount, row.currency) : '—';
  const description = rowEdit?.description ?? row.description ?? '';
  const categoryId =
    rowEdit?.categoryId !== undefined ? rowEdit.categoryId : row.categoryId;
  const paymentMethodId =
    rowEdit?.paymentMethodId !== undefined ? rowEdit.paymentMethodId : row.paymentMethodId;
  // Las categorías del tipo que corresponde: ofrecer una de gasto para un ingreso termina en un
  // 400 del server al confirmar, después de que el usuario ya dio el OK.
  const options = categories.filter(
    (category) => category.type === 'BOTH' || category.type === row.type,
  );

  return (
    <>
      <tr className={row.status === 'ERROR' ? 'opacity-60' : undefined}>
        <td className="px-2 py-1.5 align-top">
          <input
            type="checkbox"
            aria-label={`Importar ${row.description ?? 'el movimiento'}`}
            checked={checked}
            disabled={row.status === 'ERROR'}
            onChange={onToggle}
          />
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 align-top tabular-nums">
          {row.date ? formatDate(row.date, pref) : '—'}
          {row.installmentNumber && row.installmentTotal && (
            <span className="block text-xs text-muted">
              cuota {row.installmentNumber}/{row.installmentTotal}
            </span>
          )}
        </td>
        <td className="px-2 py-1.5 align-top">
          {/* Celda de planilla: se edita donde está, sin abrir nada. */}
          <input
            type="text"
            aria-label={`Descripción de ${row.description ?? 'el movimiento'}`}
            value={description}
            onChange={(e) => onEdit({ description: e.target.value })}
            className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 hover:border-line focus:border-accent focus:outline-none"
          />
          {row.collapsedCount > 1 && (
            <span className="text-xs text-muted">{row.collapsedCount} movimientos</span>
          )}
        </td>
        <td className="px-2 py-1.5 align-top">
          <select
            aria-label={`Categoría de ${row.description ?? 'el movimiento'}`}
            value={categoryId ?? ''}
            onChange={(e) => onEdit({ categoryId: e.target.value || null })}
            className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 hover:border-line focus:border-accent focus:outline-none"
          >
            <option value="">Sin categoría</option>
            {options.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {row.categorySource === 'HISTORY' && categoryId === row.categoryId && (
            <span className="block text-xs text-muted">de tus movimientos</span>
          )}
        </td>
        <td className="px-2 py-1.5 align-top">
          {paymentMethods.length === 0 ? (
            <span className="text-xs text-muted">—</span>
          ) : (
            <select
              aria-label={`Método de pago de ${row.description ?? 'el movimiento'}`}
              value={paymentMethodId ?? ''}
              onChange={(e) => onEdit({ paymentMethodId: e.target.value || null })}
              className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 hover:border-line focus:border-accent focus:outline-none"
            >
              <option value="">Sin método</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          )}
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 text-right align-top tabular-nums">
          {row.type === 'EXPENSE' ? '-' : ''}
          {amount}
        </td>
      </tr>
      {(row.issues.length > 0 || row.ownTransferAccountId) && (
        <tr>
          <td colSpan={6} className="px-2 pb-2 pt-0">
            <ul className="flex flex-col gap-0.5 text-xs text-muted">
              {row.issues.map((issue, i) => (
                <li key={`${issue.code}-${i}`}>{issue.message}</li>
              ))}
            </ul>
            {row.ownTransferAccountId && (
              <div className="mt-1 max-w-64">
                <Select
                  label="Emparejar con"
                  value={transferTarget}
                  onChange={(e) => onTransferTarget(e.target.value)}
                >
                  <option value="">No es una transferencia entre mis cuentas</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
