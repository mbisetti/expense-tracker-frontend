# Contrato de invalidación de cache (TanStack Query)

*Escrito en la corrección post-auditoría (Ago 2026). Es el **contrato 4** de los cuatro que salieron
del análisis de causa raíz; los otros tres viven en `docs/contratos.md` del repo backend.*

---

## Por qué existe

El hallazgo **F4**: `useStatementPaid` no invalidaba `['transactions']`. Con `pay: true` ese endpoint
crea una **transferencia real** madre→tarjeta, o sea **dos transactions nuevas** en el ledger, y el
feed de Movimientos no se enteraba.

No fue descuido de quien lo escribió: el comentario del archivo enumeraba con cuidado qué alcanzaba
`['accounts']` (statements, saldos, todo lo derivado) y simplemente **no existía en ningún lado la
regla** "toda mutación que mueve plata invalida el feed". Cada mutación la reinventó, y una la
reinventó incompleta.

Además estaba **tapado por otro problema**: el `staleTime: 0` por default hace que navegar a
Movimientos remonte la query y refetchee igual. El bug era invisible mientras el otro existiera.

---

## La jerarquía de keys

Las keys están diseñadas para que invalidar el prefijo alcance a todo lo derivado. **Respetá la
jerarquía**: una key nueva que no cuelgue del prefijo correcto queda fuera de todas las
invalidaciones existentes y nadie se entera hasta que un dato viejo aparece en pantalla.

```
['accounts']                                  useAccounts
['accounts', id, 'statement', offset]         useStatement          ← cuelga de ['accounts']
['transactions', filters]                     useTransactions
['transfers', page, size]                     useTransfers
['summary', 'overview']                       useDashboardOverview
['summary', 'monthly']                        useMonthlySummary
['summary', 'budgets']                        useBudgetsSummary
['summary', 'expenses', year, month]          useExpensesSummary
['summary', 'expectedIncome', year, month]    useExpectedIncome
['summary', 'shared']                         useSharedSummary      ← acumulado, sin año/mes a propósito
['income', 'sources']                         useIncomeSources
['income', 'entries', page, size]             useIncomeEntries
['income', 'deductions', sourceId]            useIncomeDeductions
['categories'] · ['payment-methods', scope] · ['savings'] · ['people'] · ['shares', txId]
['recurring-expenses'] · ['notifications'] · ['notificationPrefs'] · ['importBatches']
['me'] · ['exchangeRate', base, target] · ['telegramLink']
```

---

## La regla

> **Toda mutación que mueve plata invalida `['transactions']`, `['accounts']` y `['summary']`.**
> Las tres. Después sumá lo específico de tu feature.

"Mueve plata" = crea, edita o borra una fila de `transactions`, **incluso si el endpoint no se llama
así**. Ese es el punto exacto donde falló F4: el endpoint es `PUT /accounts/{id}/statement/paid` y
crea dos transactions.

### Estado actual

| Mutación | `transactions` | `accounts` | `summary` | específico |
|---|:---:|:---:|:---:|---|
| `useTransactionMutations` | ✅ | ✅ | ✅ | — |
| `useTransferMutations` | ✅ | ✅ | ✅ | `transfers` |
| `useIncomeMutations` | ✅ | ✅ | ✅ | `income` |
| `useImport` | ✅ | ✅ | ✅ | `importBatches` |
| `useShared` (settle / replaceShares) | ✅ | ✅ | ✅ | `shares` |
| `useRecurringMutations` | ✅ | — | ✅ | `recurring-expenses` |
| **`useStatementPaid`** | ✅ *(desde F4)* | ✅ | ✅ | `transfers` |
| `useAccountMutations` | — | ✅ | ✅ | — |
| `useCategoryMutations` | — | — | ✅ | `categories` |
| `useBudgetMutations` | — | — | ✅ | — |
| `useSavingsMutations` | — | — | — | `savings` |
| `usePaymentMethodMutations` | — | — | — | `payment-methods` |
| `useNotifications` | — | — | — | `notifications` |

Las que no mueven plata no necesitan las tres — pero fijate si tu mutación **cambia cómo se lee** una
tx: renombrar una categoría deja el nombre viejo en el feed cacheado (hoy no se invalida
`['transactions']`; es una imprecisión conocida y menor).

---

## Política de retry (`lib/queryClient.ts`)

- **4xx no se reintenta.** Es determinístico: el server contesta lo mismo. Antes, con el `retry: 3`
  de fábrica, un 422 `INSUFFICIENT_BALANCE` tardaba ~7 segundos en mostrarse (hallazgo F1).
- **5xx y fallas de red: hasta 2 reintentos.**
- **Mutaciones: nunca.** Un `POST /transactions` reintentado es un gasto duplicado. Está explícito
  para que un cambio de default de la librería no lo altere sin que nadie lo note.

### `staleTime` sigue en 0, y es una decisión

Subirlo bajaría el tráfico, pero el proyecto tiene una postura escrita: *"en una app de plata, un
dato viejo mostrado como actual es peor que un error"* (`vite.config.ts`, `runtimeCaching: []` del
service worker). Cambiarlo la contradiría en silencio.

**Si algún día se sube, esta tabla pasa de ser buena práctica a ser crítica**: hoy el refetch al
montar tapa cualquier invalidación faltante.
