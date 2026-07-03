import { describe, expect, it } from 'vitest';
import { buildTransactionsQuery } from './api';

describe('buildTransactionsQuery', () => {
  it('devuelve string vacío sin filtros', () => {
    expect(buildTransactionsQuery({})).toBe('');
  });

  it('arma el query string con los filtros presentes', () => {
    const qs = buildTransactionsQuery({
      accountId: 'abc',
      type: 'EXPENSE',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
      page: 2,
      size: 20,
    });
    const params = new URLSearchParams(qs.slice(1));
    expect(params.get('accountId')).toBe('abc');
    expect(params.get('type')).toBe('EXPENSE');
    expect(params.get('dateFrom')).toBe('2026-07-01');
    expect(params.get('dateTo')).toBe('2026-07-31');
    expect(params.get('page')).toBe('2');
    expect(params.get('size')).toBe('20');
  });

  it('omite valores undefined y strings vacíos', () => {
    const qs = buildTransactionsQuery({
      accountId: undefined,
      search: '',
      page: 0,
    });
    expect(qs).toBe('?page=0');
  });

  it('escapea caracteres especiales en search', () => {
    const qs = buildTransactionsQuery({ search: 'café & té' });
    const params = new URLSearchParams(qs.slice(1));
    expect(params.get('search')).toBe('café & té');
  });
});
