import { useRef, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import { ImportPreviewModal } from './ImportPreviewModal';
import { importErrorMessage } from './errorMessages';
import {
  useImportBatches,
  useImportConfirm,
  useImportPreview,
  useImportTemplate,
  useUndoImport,
} from './useImport';
import type { ConfirmOptions, ImportBatch } from './api';

// Sección "Importación" de /datos: plantilla → completar → subir → preview → confirmar.
// El archivo viaja dos veces (dry-run y confirm, D3) — por eso se retiene en el estado.
export function ImportSection() {
  const toast = useToast();
  const { pref } = useDateFormat();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [undoTarget, setUndoTarget] = useState<ImportBatch | null>(null);

  const template = useImportTemplate();
  const preview = useImportPreview();
  const confirm = useImportConfirm();
  const batches = useImportBatches();
  const undo = useUndoImport();

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setPendingFile(file);
    preview.mutate(file, {
      onError: (error) => {
        setPendingFile(null);
        toast.error(importErrorMessage(error));
      },
    });
  };

  const handleConfirm = (options: ConfirmOptions) => {
    if (!pendingFile) return;
    confirm.mutate(
      { file: pendingFile, options },
      {
        onSuccess: (result) => {
          setPendingFile(null);
          preview.reset();
          toast.success(
            result.imported === 1
              ? 'Se importó 1 movimiento.'
              : `Se importaron ${result.imported} movimientos.`,
          );
        },
        onError: (error) => {
          toast.error(importErrorMessage(error));
          // El mundo cambió entre el preview y el confirm (D3): re-correr el dry-run
          // refresca el reporte con los errores nuevos.
          if (error.code === 'IMPORT_HAS_ERRORS' && pendingFile) {
            preview.mutate(pendingFile);
          }
        },
      },
    );
  };

  const closePreview = () => {
    setPendingFile(null);
    preview.reset();
  };

  const handleUndo = () => {
    if (!undoTarget) return;
    undo.mutate(undoTarget.id, {
      onSuccess: () => toast.success('Import deshecho: sus movimientos se borraron.'),
      onError: (error) => toast.error(importErrorMessage(error)),
      onSettled: () => setUndoTarget(null),
    });
  };

  const recent = batches.data ?? [];

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-ink">Importación</h2>
          <span className="text-sm text-muted">
            Bajá la plantilla, completala con tus movimientos y subila. Vas a revisar todo antes
            de importar.
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void template.download()}
            loading={template.isDownloading}
          >
            Descargar plantilla
          </Button>
          <Button
            type="button"
            onClick={() => fileInput.current?.click()}
            loading={preview.isPending}
          >
            Subir archivo
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx"
            className="hidden"
            aria-label="Archivo de movimientos"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = ''; // permite re-elegir el mismo archivo tras corregirlo
            }}
          />
        </div>

        {recent.length > 0 && (
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-ink">Imports recientes</h3>
            <ul className="flex flex-col divide-y divide-line">
              {recent.map((batch) => (
                <li key={batch.id} className="flex min-h-10 items-center justify-between gap-3 py-1">
                  <span className={`truncate text-sm ${batch.undoneAt ? 'text-muted line-through' : 'text-body'}`}>
                    {batch.filename} · {batch.sourceLabel ?? 'plantilla'} · {batch.rowCount}{' '}
                    {batch.rowCount === 1 ? 'movimiento' : 'movimientos'} ·{' '}
                    {formatDate(batch.createdAt.slice(0, 10), pref)}
                  </span>
                  {batch.undoneAt ? (
                    <span className="shrink-0 text-xs text-muted">Deshecho</span>
                  ) : (
                    <Button type="button" variant="ghost" onClick={() => setUndoTarget(batch)}>
                      Deshacer
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {preview.data && pendingFile && (
        <ImportPreviewModal
          open
          report={preview.data}
          onClose={closePreview}
          onConfirm={handleConfirm}
          isImporting={confirm.isPending}
        />
      )}

      <ConfirmDialog
        open={undoTarget !== null}
        title="Deshacer import"
        message={
          undoTarget
            ? `Se van a borrar los ${undoTarget.rowCount} movimientos de "${undoTarget.filename}". Esta acción no toca el resto de tus datos.`
            : ''
        }
        confirmLabel="Deshacer import"
        onConfirm={handleUndo}
        onCancel={() => setUndoTarget(null)}
      />
    </Card>
  );
}
