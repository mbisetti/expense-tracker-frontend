import { describe, expect, it } from 'vitest';
import { ipcMonthLabel, quoteLabel } from './quoteLabel';

describe('quoteLabel', () => {
  it('nombra las tres casas con la fecha', () => {
    expect(quoteLabel('MEP', '2026-09-09')).toBe('MEP del 9/9');
    expect(quoteLabel('BLUE', '2026-09-10')).toBe('Blue del 10/9');
    expect(quoteLabel('OFICIAL', '2026-12-01')).toBe('Oficial del 1/12');
  });

  // La fecha se parte a mano justo por esto: new Date('2026-09-01') es medianoche UTC y en
  // Buenos Aires cae el 31 de agosto.
  it('no corre la fecha un día para atrás por la zona horaria', () => {
    expect(quoteLabel('MEP', '2026-09-01')).toBe('MEP del 1/9');
  });

  it('sin casa devuelve null: es la app de antes de S49, no un error', () => {
    expect(quoteLabel(null, '2026-09-09')).toBeNull();
    expect(quoteLabel(undefined, undefined)).toBeNull();
    expect(quoteLabel('CCL', '2026-09-09')).toBeNull();
  });

  it('sin fecha devuelve sólo la casa', () => {
    expect(quoteLabel('MEP', null)).toBe('MEP');
    expect(quoteLabel('BLUE')).toBe('Blue');
  });
});

describe('ipcMonthLabel', () => {
  it('convierte YYYY-MM en "julio 2026"', () => {
    expect(ipcMonthLabel('2026-07')).toBe('julio 2026');
    expect(ipcMonthLabel('2026-01')).toBe('enero 2026');
    expect(ipcMonthLabel('2025-12')).toBe('diciembre 2025');
  });

  it('sin mes devuelve null', () => {
    expect(ipcMonthLabel(null)).toBeNull();
    expect(ipcMonthLabel(undefined)).toBeNull();
    expect(ipcMonthLabel('2026')).toBeNull();
  });
});
