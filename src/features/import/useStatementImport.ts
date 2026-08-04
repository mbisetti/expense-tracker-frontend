import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttpUpload } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type {
  StatementConfirmPayload,
  StatementReport,
  StatementSourceKind,
} from './statementApi';

// S37 — subida de extractos y resúmenes en PDF. Dos fases como en S28, pero con una diferencia
// de fondo (D12): el confirm NO vuelve a llamar al modelo. Manda el archivo más el reporte
// revisado, y el server re-valida todo contra la DB sin re-estructurar. Una llamada al LLM por
// import, no dos, y lo que el usuario aprobó es exactamente lo que se importa.

function useInvalidateAfterImport() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['importBatches'] });
    // El import puede crear personas y saldar partes (D8/D14), y puede mover el ciclo (D10).
    queryClient.invalidateQueries({ queryKey: ['people'] });
    queryClient.invalidateQueries({ queryKey: ['shared'] });
    queryClient.invalidateQueries({ queryKey: ['statement'] });
  };
}

const PATH: Record<StatementSourceKind, string> = {
  ACCOUNT_STATEMENT: '/import/statements/account',
  CARD_STATEMENT: '/import/statements/card',
};

export type StatementUpload = {
  kind: StatementSourceKind;
  file: File;
  accountId: string;
  password?: string;
};

function uploadBody(upload: StatementUpload): FormData {
  const body = new FormData();
  body.append('file', upload.file);
  body.append('accountId', upload.accountId);
  if (upload.password) {
    // La contraseña viaja sólo en este request: no se guarda ni se loguea de ningún lado (D11).
    body.append('password', upload.password);
  }
  return body;
}

// Subir SIEMPRE es un dry-run: lee, valida y devuelve el preview sin tocar nada. No hay flag,
// porque importar de verdad es el confirm y necesita el reporte revisado (D12).
export function useStatementPreview() {
  const upload = useHttpUpload();

  return useMutation<StatementReport, ApiError, StatementUpload>({
    mutationFn: (input) => upload<StatementReport>(PATH[input.kind], uploadBody(input)),
  });
}

/** Confirm: el mismo archivo más lo que el usuario revisó. */
export function useStatementConfirm() {
  const upload = useHttpUpload();
  const invalidate = useInvalidateAfterImport();

  return useMutation<
    StatementReport,
    ApiError,
    { upload: StatementUpload; payload: StatementConfirmPayload }
  >({
    mutationFn: ({ upload: input, payload }) => {
      const body = uploadBody(input);
      body.append(
        'payload',
        new Blob([JSON.stringify(payload)], { type: 'application/json' }),
      );
      return upload<StatementReport>('/import/statements/confirm', body);
    },
    onSuccess: invalidate,
  });
}
