import { describe, expect, it } from 'vitest';
import { buildExportQuery, fallbackFilename } from './api';

describe('buildExportQuery', () => {
  it('sin params devuelve string vacío', () => {
    expect(buildExportQuery()).toBe('');
    expect(buildExportQuery({})).toBe('');
  });

  it('omite undefined, vacío y false (los flags del backend ya vienen en false)', () => {
    expect(
      buildExportQuery({
        accountId: 'a1',
        dateFrom: undefined,
        dateTo: '',
        uncategorized: false,
        onlyTransferLegs: true,
      }),
    ).toBe('?accountId=a1&onlyTransferLegs=true');
  });

  it('serializa fechas y búsqueda con encoding', () => {
    expect(buildExportQuery({ dateFrom: '2026-03-01', search: 'súper mercado' })).toBe(
      '?dateFrom=2026-03-01&search=s%C3%BAper+mercado',
    );
  });
});

describe('fallbackFilename', () => {
  it('arma el mismo nombre que manda el server', () => {
    const day = new Date(2026, 6, 24);
    expect(fallbackFilename('transactions', day)).toBe('maat-transacciones-20260724.xlsx');
    expect(fallbackFilename('accounts', day)).toBe('maat-movimientos-20260724.xlsx');
    expect(fallbackFilename('expenses', day)).toBe('maat-gastos-20260724.xlsx');
    expect(fallbackFilename('incomes', day)).toBe('maat-ingresos-20260724.xlsx');
  });

  it('padea mes y día', () => {
    expect(fallbackFilename('expenses', new Date(2026, 0, 5))).toBe(
      'maat-gastos-20260105.xlsx',
    );
  });
});
