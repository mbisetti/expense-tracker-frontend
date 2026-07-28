import { useCallback, useState } from 'react';
import { useHttpBlob } from '../../lib/useHttp';
import { useToast } from '../../components/ui/toastContext';
import { buildExportQuery, fallbackFilename, type ExportDataset, type ExportParams } from './api';
import { exportErrorMessage } from './errorMessages';

// Dispara la descarga real: el Blob se vuelve una URL efímera, un <a download> invisible la
// clickea y la URL se revoca enseguida (si no, el Blob queda vivo hasta recargar la página).
// Exportada: la plantilla del import (features/import) baja archivos por el mismo camino.
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// Sprint 26: descarga de reportes .xlsx. El token vive en memoria, así que la descarga pasa
// por fetch autenticado (useHttpBlob) y no por un <a href> pelado.
export function useExport() {
  const httpBlob = useHttpBlob();
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const exportFile = useCallback(
    async (dataset: ExportDataset, params?: ExportParams) => {
      setIsExporting(true);
      try {
        const { blob, filename } = await httpBlob(
          `/export/${dataset}${buildExportQuery(params)}`,
        );
        triggerDownload(blob, filename ?? fallbackFilename(dataset, new Date()));
      } catch (error) {
        toast.error(exportErrorMessage(error));
      } finally {
        setIsExporting(false);
      }
    },
    [httpBlob, toast],
  );

  return { exportFile, isExporting };
}
