import { describe, expect, it } from 'vitest';
import { defaultMethodValue } from './defaultMethodValue';
import type { Account } from '../accounts/api';

const base: Account = {
  id: 'acc-1',
  name: 'Santander',
  type: 'BANK',
  currency: 'ARS',
  balance: 0,
  isInformal: false,
  createdAt: '2026-09-01T00:00:00',
  statementCloseDay: null,
  paymentDueDay: null,
  balances: [],
  institution: null,
  linkedAccountId: null,
};

describe('defaultMethodValue', () => {
  it('devuelve el uuid del PaymentMethod predeterminado', () => {
    expect(defaultMethodValue({ ...base, defaultPaymentMethodId: 'pm-1' })).toBe('pm-1');
  });

  it('devuelve "" si la cuenta no tiene predeterminado', () => {
    expect(defaultMethodValue(base)).toBe('');
    expect(defaultMethodValue({ ...base, defaultPaymentMethodId: null })).toBe('');
  });

  it('devuelve "" si no hay cuenta', () => {
    expect(defaultMethodValue(undefined)).toBe('');
  });

  it('con withCards devuelve card:<uuid> para una tarjeta vinculada', () => {
    expect(
      defaultMethodValue({ ...base, defaultCardAccountId: 'acc-card' }, { withCards: true }),
    ).toBe('card:acc-card');
  });

  // El default de `withCards` es false a propósito: sólo TransactionForm ofrece las tarjetas como
  // opción. En los otros tres, un value `card:` que no está entre las options deja el <Select> en
  // blanco, sin error y sin explicación.
  it('sin withCards ignora la tarjeta y devuelve ""', () => {
    expect(defaultMethodValue({ ...base, defaultCardAccountId: 'acc-card' })).toBe('');
  });

  it('el método gana sobre la tarjeta si por lo que sea vinieran los dos', () => {
    expect(
      defaultMethodValue(
        { ...base, defaultPaymentMethodId: 'pm-1', defaultCardAccountId: 'acc-card' },
        { withCards: true },
      ),
    ).toBe('pm-1');
  });
});
