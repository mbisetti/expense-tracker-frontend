import { describe, expect, it } from 'vitest';

/**
 * Contrato 4 con dientes — `docs/contratos-cache.md`.
 *
 * > Toda mutación que MUEVE PLATA invalida ['transactions'], ['accounts'] y ['summary'].
 *
 * Este test existe por F4. `useStatementPaid` no invalidaba `['transactions']` aunque con
 * `pay: true` crea una transferencia real, o sea DOS transactions en el ledger. No fue
 * descuido: el comentario del archivo enumeraba con cuidado qué alcanzaba `['accounts']`.
 * Simplemente NO EXISTÍA la regla en ningún lado, así que cada mutación la reinventó y una la
 * reinventó incompleta.
 *
 * Escribir la regla en un .md no impide que la próxima la reinvente igual. Esto sí.
 *
 * Se mira el CÓDIGO FUENTE y no el comportamiento en runtime a propósito: lo que falla es
 * "alguien escribió un hook nuevo y se olvidó de una key", y eso se ve en el archivo. Un test
 * de runtime necesitaría montar cada hook con su server mockeado — mucha máquina para
 * verificar una lista.
 */

// import.meta.glob y no node:fs: es la API de Vite, typechequea sin @types/node y funciona
// igual en el runner. Las claves quedan como '../features/accounts/useStatementPaid.ts'.
const FEATURE_SOURCES = import.meta.glob('../features/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const LIB_SOURCES = import.meta.glob('./*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * Hooks que mueven plata: crean, editan o borran filas de `transactions`. La lista es
 * explícita a propósito. Si agregás un hook que mueve plata y no lo sumás acá, este test no te
 * va a atrapar — pero sumarlo es una línea, y el día que alguien lea este archivo va a
 * entender por qué importa.
 *
 * `useStatementPaid` está en la lista aunque el endpoint se llame `/accounts/{id}/statement/paid`.
 * Ese es justo el punto de F4: el nombre del endpoint no dice si mueve plata.
 */
const MONEY_MOVING_HOOKS = [
  'transactions/useTransactionMutations.ts',
  'transfers/useTransferMutations.ts',
  'income/useIncomeMutations.ts',
  'accounts/useStatementPaid.ts',
];

const REQUIRED_KEYS = ['transactions', 'accounts', 'summary'];

/**
 * Saca comentarios antes de mirar el código. No es cosmético: la primera versión de este test
 * buscaba la cadena `'transactions'` y daba verde aunque le sacaras la invalidación, porque el
 * comentario que explica F4 la menciona. Un test que no puede fallar no prueba nada — se
 * detectó revirtiendo el fix a propósito.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function featureCode(relativePath: string): string {
  const source = FEATURE_SOURCES[`../features/${relativePath}`];
  if (source === undefined) {
    throw new Error(
      `no existe src/features/${relativePath}. Si lo renombraste, actualizá esta lista: ` +
        'el contrato tiene que seguir al código.',
    );
  }
  return stripComments(source);
}

/** La invalidación de verdad, no la palabra suelta. */
function invalidates(code: string, key: string): boolean {
  return new RegExp(String.raw`queryKey:\s*\[\s*'${key}'`).test(code);
}

describe('contrato de invalidación de cache', () => {
  it.each(MONEY_MOVING_HOOKS)('%s invalida transactions, accounts y summary', (hook) => {
    const code = featureCode(hook);

    for (const key of REQUIRED_KEYS) {
      expect(
        invalidates(code, key),
        `${hook} mueve plata y tiene que invalidar ['${key}']. ` +
          'Ver docs/contratos-cache.md — este es el hallazgo F4 exacto.',
      ).toBe(true);
    }
  });

  // La jerarquía es lo que hace que invalidar el prefijo alcance a todo lo derivado. Una key
  // nueva que no cuelgue del prefijo correcto queda FUERA de todas las invalidaciones que ya
  // existen, y nadie se entera hasta que un dato viejo aparece en pantalla.
  it('las queries de statement cuelgan de accounts, no de una key propia', () => {
    expect(
      /queryKey:\s*\[\s*'accounts'/.test(featureCode('accounts/useStatement.ts')),
      "useStatement tiene que arrancar su key con 'accounts' para que invalidar ['accounts'] " +
        'la alcance. Con key propia, pagar el resumen dejaría el statement viejo en pantalla.',
    ).toBe(true);
  });

  // Un POST /transactions reintentado es un gasto duplicado. Está explícito en el QueryClient
  // para que un cambio de default de la librería no lo altere sin que nadie lo note (F1).
  it('las mutaciones nunca se reintentan', () => {
    expect(
      /mutations:\s*\{[^}]*retry:\s*false/s.test(stripComments(LIB_SOURCES['./queryClient.ts'])),
      'mutations.retry tiene que ser false explícitamente: un POST /transactions reintentado ' +
        'es un gasto duplicado.',
    ).toBe(true);
  });

  // Red contra el olvido silencioso: si aparece un hook de mutación nuevo en cualquier feature,
  // que alguien lo mire y decida si mueve plata. No falla por existir — falla si no invalida
  // NADA, que nunca es lo correcto para una mutación.
  it('todo hook de mutación invalida algo', () => {
    const offenders = Object.entries(FEATURE_SOURCES)
      .filter(([path]) => /\/use[A-Za-z]*Mutations?\.ts$/.test(path) && !path.includes('.test.'))
      .filter(([, source]) => source.includes('useMutation'))
      .filter(([, source]) => {
        const code = stripComments(source);
        return !code.includes('invalidateQueries') && !/nvalidate\w*\(/.test(code);
      })
      .map(([path]) => path.replace('../features/', ''));

    expect(
      offenders,
      `estos hooks mutan y no invalidan nada: ${offenders.join(', ')}. ` +
        'Si de verdad no hace falta, dejá el motivo escrito en el archivo.',
    ).toEqual([]);
  });
});
