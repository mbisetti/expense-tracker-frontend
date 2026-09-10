import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ArsQuote } from '../../lib/quoteLabel';

export type DollarSnapshot = {
  buy: number | null;
  sell: number | null;
  /** "YYYY-MM-DD" */
  date: string;
};

export type LatestIndexes = {
  /** Una entrada por casa. Cada una puede venir en null: todavía sin datos. */
  usd: Record<ArsQuote, DollarSnapshot | null>;
  ipc: { month: string; value: number } | null;
};

// S49 — cuánto está cada dólar hoy y hasta qué mes hay IPC. Lo usa SOLO la pantalla de Ajustes,
// para poner el número al lado de cada opción del selector.
//
// staleTime de 10 minutos: la tabla se escribe una vez por día. Pedirlo más seguido no trae
// nada nuevo, y si el job todavía no corrió la respuesta viene con nulls y la pantalla
// simplemente no muestra la línea de valores.
export function useLatestIndexes() {
  const http = useHttp();
  return useQuery({
    queryKey: ['indexes', 'latest'],
    queryFn: () => http<LatestIndexes>('/indexes/latest'),
    staleTime: 10 * 60 * 1000,
  });
}
