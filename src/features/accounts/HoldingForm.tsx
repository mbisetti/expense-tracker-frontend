import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import { accountErrorMessage } from './errorMessages';
import { useHoldingMutations } from './useHoldings';
import type { Holding } from './api';

type HoldingFormProps = {
  accountId: string;
  currency: string;
  /** undefined = alta. Con tenencia = edición (el símbolo no se edita). */
  holding?: Holding;
  onClose: () => void;
};

/**
 * S43 — cargar o corregir una tenencia a mano.
 *
 * <p>Es un recordatorio, no un libro contable: se carga lo que tenés sin reconstruir la historia
 * de compras, y se corrige sin ceremonia cuando el número quedó viejo. Por eso el alta pide sólo
 * tres cosas y el borrado está acá mismo.
 *
 * <p>El símbolo no se edita: cambiarlo es borrar una tenencia y crear otra. Dejarlo pasar chocaría
 * contra el UNIQUE (cuenta, símbolo) del server con un conflicto que no explica nada.
 */
export function HoldingForm({ accountId, currency, holding, onClose }: HoldingFormProps) {
  const editing = holding !== undefined;
  const toast = useToast();
  const { create, update, remove } = useHoldingMutations(accountId);

  const [symbol, setSymbol] = useState(holding?.symbol ?? '');
  // maxDecimals 8 en la cantidad: precargar 0,0074 con el default de 2 lo mostraría como "0,01".
  const [quantity, setQuantity] = useState(numberToAmountDisplay(holding?.quantity ?? 0, 8));
  const [invested, setInvested] = useState(numberToAmountDisplay(holding?.invested ?? 0));

  const parsedQuantity = parseAmountInput(quantity);
  const parsedInvested = parseAmountInput(invested);
  const cleanSymbol = symbol.trim().toUpperCase();
  const canSubmit = cleanSymbol !== '' && parsedQuantity > 0;

  const pending = create.isPending || update.isPending || remove.isPending;

  const submit = () => {
    if (!canSubmit) return;
    const onError = (error: unknown) => toast.error(accountErrorMessage(error));

    if (editing) {
      update.mutate(
        { id: holding.id, changes: { quantity: parsedQuantity, invested: parsedInvested } },
        {
          onSuccess: () => {
            toast.success('Tenencia actualizada.');
            onClose();
          },
          onError,
        },
      );
    } else {
      create.mutate(
        { symbol: cleanSymbol, quantity: parsedQuantity, invested: parsedInvested },
        {
          onSuccess: () => {
            toast.success('Tenencia agregada.');
            onClose();
          },
          onError,
        },
      );
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      disableClose={pending}
      title={editing ? `Editar ${holding.symbol}` : 'Agregar tenencia'}
      footer={
        // Mismo tratamiento que AccountForm: grupo centrado, gap uniforme y Borrar como ghost
        // con los tonos de `expense` (no un botón rojo sólido, que pesaba más que Guardar y
        // hacía ver la fila despareja). Las tres cards de edición se ven iguales.
        //
        // `w-full` no es decorativo: el footer del Modal es `flex justify-end`, así que sin
        // ocupar el ancho este div sería un item que se encoge y el `justify-center` no tendría
        // sobre qué centrar (el grupo quedaría pegado a la derecha igual que antes).
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <Button type="button" onClick={submit} loading={pending} disabled={!canSubmit}>
            Guardar
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              className="border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
              onClick={() =>
                remove.mutate(holding.id, {
                  onSuccess: () => {
                    toast.success('Tenencia borrada.');
                    onClose();
                  },
                  onError: (error) => toast.error(accountErrorMessage(error)),
                })
              }
              disabled={pending}
            >
              Borrar
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-body">
          Es un recordatorio de qué tenés. No mueve el saldo de la cuenta: el valor total sigue
          siendo el mismo, esto dice en qué está puesto.
        </p>

        {!editing && (
          <Input
            label="Moneda"
            id="holding-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="BTC"
            maxLength={15}
            autoComplete="off"
            required
            disabled={pending}
            helper="El símbolo, como aparece en el exchange."
          />
        )}

        <MoneyInput
          label="Cantidad"
          id="holding-quantity"
          value={quantity}
          onValueChange={setQuantity}
          maxDecimals={8}
          required
          disabled={pending}
          helper="Hasta 8 decimales."
        />

        <MoneyInput
          label={`Cuánto pusiste (${currency})`}
          id="holding-invested"
          value={invested}
          onValueChange={setInvested}
          disabled={pending}
          helper="Lo que te costó en total. Dejalo en cero si no te costó nada."
        />

        {!canSubmit && (quantity.trim() !== '' || symbol.trim() !== '') && (
          <p role="alert" className="text-sm text-expense">
            Poné la moneda y una cantidad mayor a cero.
          </p>
        )}
      </div>
    </Modal>
  );
}
