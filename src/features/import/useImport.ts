import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp, useHttpBlob, useHttpUpload } from '../../lib/useHttp';
import { useToast } from '../../components/ui/toastContext';
import type { ApiError } from '../../lib/http';
import { triggerDownload } from '../export/useExport';
import { importQuery, type ConfirmOptions, type ImportBatch, type ImportReport } from './api';

// Post-confirm y post-deshacer se invalida lo MISMO que el alta/borrado de una tx
// (useTransactionMutations §10.3) + el historial de imports.
function useInvalidateAfterImport() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['importBatches'] });
  };
}

// Descarga de la plantilla por usuario (mismo camino autenticado del export S26).
export function useImportTemplate() {
  const httpBlob = useHttpBlob();
  const toast = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async () => {
    setIsDownloading(true);
    try {
      const { blob, filename } = await httpBlob('/import/transactions/template');
      await triggerDownload(blob, filename ?? 'plantilla-movimientos.xlsx');
    } catch {
      // Sin este catch el error muere como rejection sin manejar (el onClick hace `void
      // download()`) y el botón vuelve a la normalidad como si nada: el mismo criterio de
      // toast que ya tiene el export. En nativo además cubre la hoja de compartir (S44).
      toast.error('No pudimos descargar la plantilla. Intentá de nuevo.');
    } finally {
      setIsDownloading(false);
    }
  }, [httpBlob, toast]);

  return { download, isDownloading };
}

function toFormData(file: File): FormData {
  const body = new FormData();
  body.append('file', file);
  return body;
}

// Dry-run (D3): valida y devuelve el reporte sin tocar nada. No invalida queries.
export function useImportPreview() {
  const upload = useHttpUpload();

  return useMutation<ImportReport, ApiError, File>({
    mutationFn: (file) => upload<ImportReport>(`/import/transactions${importQuery(true)}`, toFormData(file)),
  });
}

// Confirm: re-sube el MISMO archivo (stateless, D3) con las decisiones del usuario.
export function useImportConfirm() {
  const upload = useHttpUpload();
  const invalidate = useInvalidateAfterImport();

  return useMutation<ImportReport, ApiError, { file: File; options: ConfirmOptions }>({
    mutationFn: ({ file, options }) =>
      upload<ImportReport>(`/import/transactions${importQuery(false, options)}`, toFormData(file)),
    onSuccess: invalidate,
  });
}

export function useImportBatches() {
  const http = useHttp();

  return useQuery({
    queryKey: ['importBatches'],
    queryFn: () => http<ImportBatch[]>('/import/batches'),
  });
}

export function useUndoImport() {
  const http = useHttp();
  const invalidate = useInvalidateAfterImport();

  return useMutation<void, ApiError, string>({
    mutationFn: (batchId) => http<void>(`/import/batches/${batchId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
