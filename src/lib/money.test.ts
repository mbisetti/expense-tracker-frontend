import { describe, expect, it } from 'vitest';
import {
  formatAmountDisplay,
  formatMoney,
  numberToAmountDisplay,
  parseAmountInput,
} from './money';

describe('formatMoney', () => {
  it('formatea con símbolo cuando la moneda es válida', () => {
    expect(formatMoney(1000, 'ARS')).toContain('1.000');
  });

  it('NO tira con moneda vacía (el crash de Ingresos) — degrada a número plano', () => {
    expect(() => formatMoney(1000, '')).not.toThrow();
    expect(formatMoney(1000, '')).toContain('1.000');
  });

  it('NO tira con un código inválido', () => {
    expect(() => formatMoney(1000, 'peso')).not.toThrow();
    expect(() => formatMoney(1000, 'AR')).not.toThrow();
  });
});

describe('parseAmountInput', () => {
  it('parsea miles con punto', () => {
    expect(parseAmountInput('150.000')).toBe(150000);
  });

  it('parsea miles + decimal con coma', () => {
    expect(parseAmountInput('150.000,50')).toBe(150000.5);
  });

  it('vacío → 0', () => {
    expect(parseAmountInput('')).toBe(0);
  });
});

describe('formatAmountDisplay', () => {
  it('agrupa miles en vivo', () => {
    expect(formatAmountDisplay('150000')).toBe('150.000');
  });

  it('bloquea letras y símbolos', () => {
    expect(formatAmountDisplay('a1b2c3')).toBe('123');
  });

  it('preserva la coma decimal en curso y limita a 2 decimales', () => {
    expect(formatAmountDisplay('150000,')).toBe('150.000,');
    expect(formatAmountDisplay('1000,509')).toBe('1.000,50');
  });

  it('los puntos tipeados se tratan como miles (no decimal)', () => {
    expect(formatAmountDisplay('150.000')).toBe('150.000');
  });
});

describe('numberToAmountDisplay', () => {
  it('número → display es-AR', () => {
    expect(numberToAmountDisplay(150000)).toBe('150.000');
    expect(numberToAmountDisplay(1234.5)).toBe('1.234,5');
  });

  it('0 → vacío', () => {
    expect(numberToAmountDisplay(0)).toBe('');
  });

  it('round-trip con parseAmountInput', () => {
    expect(parseAmountInput(numberToAmountDisplay(150000.5))).toBe(150000.5);
  });
});
