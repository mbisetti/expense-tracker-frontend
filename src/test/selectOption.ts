import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { Matcher, SelectorMatcherOptions } from '@testing-library/react';

// Helper para el Select custom (listbox), que reemplaza al viejo
//   fireEvent.change(getByLabelText(label), { target: { value } })
// del <select> nativo. Abre el dropdown por su etiqueta y clickea la opción por su value
// (cada opción expone data-value). Devuelve una promesa: el trigger puede aparecer async.
export async function selectOption(
  label: Matcher,
  value: string,
  options?: SelectorMatcherOptions,
): Promise<void> {
  const trigger = await screen.findByLabelText(label, options);
  // Cierra cualquier otro dropdown abierto (el cierre por click-afuera escucha 'mousedown',
  // que fireEvent.click no dispara) para no dejar dos listbox montados a la vez.
  fireEvent.mouseDown(document.body);
  fireEvent.click(trigger);
  const listbox = await screen.findByRole('listbox');
  // La opción puede cargar async (datos del server): esperamos a que aparezca por su value.
  let opt: HTMLElement | undefined;
  await waitFor(() => {
    opt = within(listbox)
      .getAllByRole('option')
      .find((el) => el.getAttribute('data-value') === value);
    if (!opt) {
      throw new Error(
        `selectOption: no encontré la opción value="${value}" en el Select "${String(label)}".`,
      );
    }
  });
  fireEvent.click(opt!);
}

// Valor actual del Select custom: el trigger lo expone en data-value (el <button> no tiene
// .value como el <select> nativo). Reemplaza a `(getByLabelText(...) as HTMLSelectElement).value`.
export function selectValue(label: Matcher, options?: SelectorMatcherOptions): string {
  return screen.getByLabelText(label, options).getAttribute('data-value') ?? '';
}

// Abre el Select custom y devuelve el <ul role="listbox"> para inspeccionar sus opciones
// (reemplaza a `within(<select>).getByRole('option', ...)`, que ahora sólo existen abiertas).
export async function openSelect(
  label: Matcher,
  options?: SelectorMatcherOptions,
): Promise<HTMLElement> {
  const trigger = await screen.findByLabelText(label, options);
  fireEvent.mouseDown(document.body);
  fireEvent.click(trigger);
  return screen.findByRole('listbox');
}
