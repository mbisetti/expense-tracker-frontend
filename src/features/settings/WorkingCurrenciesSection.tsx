import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { XIcon } from '../../components/ui/icons';
import { useToast } from '../../components/ui/toastContext';
import { currencyNoun } from '../../lib/money';
import { useMe, useUpdateMe } from '../auth/useMe';

// S27.1 (FR-1) — "Monedas con las que trabajás".
//
// Existe por el problema del huevo y la gallina que dejó S27: las opciones del selector de
// moneda salen de las monedas que la cuenta YA TUVO, así que la primera compra en dólares sobre
// una tarjeta en pesos obligaba a pasar por "Otra…" y tipear USD a mano.
//
// La lista SUMA opciones y nunca las quita (D1): un sub-balance real se ofrece siempre, esté o
// no configurado. El copy lo dice, porque el riesgo de esta pantalla es que el usuario crea que
// está restringiendo algo.
export function WorkingCurrenciesSection() {
  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const toast = useToast();
  const [draft, setDraft] = useState('');

  const currencies = me?.workingCurrencies ?? [];
  const favorite = me?.defaultCurrency;
  const alreadyThere = currencies.includes(draft);
  const canAdd = draft.length === 3 && !alreadyThere && !updateMe.isPending;

  function save(next: string[], onOk: string) {
    updateMe.mutate(
      { workingCurrencies: next },
      {
        onSuccess: () => toast.success(onOk),
        onError: () => toast.error('No pudimos guardar las monedas. Intentá de nuevo.'),
      },
    );
  }

  function add() {
    if (!canAdd) return;
    save([...currencies, draft], `${draft} agregada.`);
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink">Monedas con las que trabajás</span>

      {currencies.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {currencies.map((c) => {
            // D3: la favorita no se puede sacar. Sin ella el usuario queda configurado fuera de
            // su propia moneda de referencia, con medio dashboard hablándole en una moneda que
            // dijo no usar.
            const isFavorite = c === favorite;
            return (
              <li
                key={c}
                className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-sm text-body"
              >
                <span>
                  {c}
                  <span className="text-muted"> · {currencyNoun(c)}</span>
                </span>
                {isFavorite ? (
                  <span className="text-xs text-muted">(favorita)</span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Quitar ${c}`}
                    disabled={updateMe.isPending}
                    onClick={() =>
                      save(
                        currencies.filter((x) => x !== c),
                        `${c} quitada.`,
                      )
                    }
                    className="text-muted transition-colors hover:text-expense disabled:opacity-50"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* El `helper` y el `error` NO van adentro del Input: viven en su wrapper, debajo del
          campo, así que `items-end` alineaba el botón con el borde inferior de ESE texto y no
          con el del campo — y encima el botón saltaba cada vez que el error aparecía o se iba.
          Afuera, el wrapper del Input es label + campo, y el botón queda a la misma altura. */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Agregar una moneda"
            id="working-currency-new"
            type="text"
            value={draft}
            // Mismo comportamiento que el "Otra…" de los formularios: 3 letras, mayúsculas, y
            // todo lo que no sea A-Z se descarta mientras se tipea.
            onChange={(e) =>
              setDraft(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            maxLength={3}
            placeholder="USD"
            disabled={updateMe.isPending}
            aria-invalid={alreadyThere ? true : undefined}
          />
        </div>
        <Button type="button" variant="secondary" onClick={add} disabled={!canAdd}>
          Agregar
        </Button>
      </div>

      {alreadyThere ? (
        <p role="alert" className="text-sm text-expense">
          Ya está en la lista
        </p>
      ) : (
        <p className="text-sm text-muted">Tres letras, como USD o EUR.</p>
      )}

      <p className="text-sm text-muted">
        Estas monedas aparecen al cargar un movimiento o una transferencia, aunque la cuenta
        todavía no tenga plata en ellas. <strong>Agregan opciones, no las quitan</strong>: si una
        cuenta ya tiene saldo en otra moneda, esa se sigue ofreciendo igual.
      </p>
    </div>
  );
}
