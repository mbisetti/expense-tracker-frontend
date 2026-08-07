import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MoneyInput } from './MoneyInput';

// Wrapper controlado: el bug sólo aparece con el valor viviendo en el padre, que es como se usa
// en toda la app.
function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <MoneyInput label="Monto" id="m" value={value} onValueChange={setValue} />;
}

function field(): HTMLInputElement {
  return screen.getByLabelText('Monto') as HTMLInputElement;
}

/** Simula un backspace en la posición del cursor (borra el caracter de la izquierda). */
function backspaceAt(input: HTMLInputElement, caret: number) {
  const next = input.value.slice(0, caret - 1) + input.value.slice(caret);
  fireEvent.change(input, { target: { value: next, selectionStart: caret - 1 } });
}

/** Simula tipear un caracter en la posición del cursor. */
function typeAt(input: HTMLInputElement, caret: number, char: string) {
  const next = input.value.slice(0, caret) + char + input.value.slice(caret);
  fireEvent.change(input, { target: { value: next, selectionStart: caret + 1 } });
}

describe('MoneyInput — editar en el medio del número', () => {
  it('el cursor NO salta al final después de borrar un dígito del medio', () => {
    render(<Harness initial="490.000" />);
    const input = field();
    input.focus();

    // Parado justo después del primer cero de "490.000" (índice 3) y backspace.
    backspaceAt(input, 3);

    expect(input.value).toBe('49.000');
    // Antes del fix el cursor terminaba en 6 (el final) y el siguiente backspace se comía el
    // último dígito: de "490.000" salía "4.900" en vez de lo que uno estaba escribiendo.
    expect(input.selectionStart).toBe(2);
  });

  it('el caso reportado: de 490.000 a 485.000 con dos backspaces y dos teclas', () => {
    render(<Harness initial="490.000" />);
    const input = field();
    input.focus();

    backspaceAt(input, 3); // borra el '0' → "49.000", cursor en 2
    backspaceAt(input, input.selectionStart!); // borra el '9' → "4.000", cursor en 1
    expect(input.value).toBe('4.000');

    typeAt(input, input.selectionStart!, '8');
    typeAt(input, input.selectionStart!, '5');

    expect(input.value).toBe('485.000');
  });

  it('cuenta por dígitos y no por caracteres: el separador que se corre no descoloca el cursor', () => {
    render(<Harness initial="1.234.567" />);
    const input = field();
    input.focus();

    // Borrar el '2' deja "1.345.67" → el formateador reagrupa a "134.567" y todos los puntos se
    // mueven. Contando caracteres el cursor caería en cualquier lado.
    backspaceAt(input, 3);

    expect(input.value).toBe('134.567');
    // Un dígito significativo a la izquierda ("1") → el cursor va justo después de ese dígito.
    expect(input.selectionStart).toBe(1);
  });

  it('tipear al final sigue funcionando como siempre', () => {
    render(<Harness initial="" />);
    const input = field();
    input.focus();

    typeAt(input, 0, '4');
    typeAt(input, input.selectionStart!, '9');
    typeAt(input, input.selectionStart!, '0');
    typeAt(input, input.selectionStart!, '0');
    typeAt(input, input.selectionStart!, '0');

    expect(input.value).toBe('49.000');
    expect(input.selectionStart).toBe(6);
  });

  it('los decimales con coma siguen andando', () => {
    render(<Harness initial="1.500" />);
    const input = field();
    input.focus();

    typeAt(input, 5, ',');
    typeAt(input, input.selectionStart!, '5');
    typeAt(input, input.selectionStart!, '0');

    expect(input.value).toBe('1.500,50');
  });
});

// ── S43 (D8): decimales configurables ───────────────────────────────────────────────────────

function CryptoHarness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <MoneyInput label="Cantidad" id="q" value={value} onValueChange={setValue} maxDecimals={8} />
  );
}

describe('MoneyInput — maxDecimals (S43 D8)', () => {
  it('con maxDecimals=8 entra una cantidad de cripto entera', () => {
    render(<CryptoHarness initial="" />);
    const input = screen.getByLabelText('Cantidad') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '0,00740000' } });

    // Con el default de 2 esto quedaba en "0,00" y el usuario guardaba un número que no es suyo.
    expect(input.value).toBe('0,00740000');
  });

  it('el noveno decimal SÍ se recorta: la columna es NUMERIC(20,8)', () => {
    render(<CryptoHarness initial="" />);
    const input = screen.getByLabelText('Cantidad') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '0,123456789' } });

    expect(input.value).toBe('0,12345678');
  });

  it('el cursor se sigue restaurando con más de 2 decimales', () => {
    render(<CryptoHarness initial="0,00740000" />);
    const input = screen.getByLabelText('Cantidad') as HTMLInputElement;
    input.focus();

    // Backspace parado en la posición 4 borra el segundo '0' de "0,00740000".
    backspaceAt(input, 4);

    expect(input.value).toBe('0,0740000');
    // Tres caracteres significativos a la izquierda ("0", ",", "0") → el cursor queda en 3, no
    // al final. Es el mismo invariante que arriba, pero con 7 decimales en juego.
    expect(input.selectionStart).toBe(3);
  });

  it('SIN la prop nada cambia: el default sigue siendo 2 decimales', () => {
    render(<Harness initial="" />);
    const input = field();

    fireEvent.change(input, { target: { value: '1500,999' } });

    expect(input.value).toBe('1.500,99');
  });
});
