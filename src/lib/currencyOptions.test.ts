import { describe, expect, it } from 'vitest';
import { currencyOptionsFor } from './currencyOptions';

const arsAccount = { currency: 'ARS', balances: [{ currency: 'ARS', balance: 1000 }] };

describe('currencyOptionsFor (S27.1)', () => {
  // AC-7: sin configurar, se comporta igual que antes del sprint.
  it('sin monedas configuradas: solo lo que la cuenta tiene', () => {
    expect(currencyOptionsFor(arsAccount, [], 'ARS')).toEqual(['ARS']);
    expect(currencyOptionsFor(arsAccount, undefined, undefined)).toEqual(['ARS']);
  });

  // AC-1: el caso que motivó el sprint — la PRIMERA compra en dólares sobre una cuenta que
  // nunca vio un dólar. Antes había que pasar por "Otra…" y tipear USD a mano.
  it('agrega las configuradas aunque la cuenta no tenga saldo en ellas', () => {
    expect(currencyOptionsFor(arsAccount, ['ARS', 'USD'], 'ARS')).toEqual(['ARS', 'USD']);
  });

  // AC-2 / D1 — la regla que no se puede romper: una preferencia AGREGA opciones, nunca oculta
  // un saldo real. Si reemplazara, una cuenta con euros dejaría de ofrecer euros el día que te
  // olvidaste de configurarlos, y la app escondería plata que existe.
  it('un sub-balance real se ofrece SIEMPRE, esté o no configurado', () => {
    const mixed = {
      currency: 'ARS',
      balances: [
        { currency: 'ARS', balance: 1000 },
        { currency: 'EUR', balance: 40 },
      ],
    };
    expect(currencyOptionsFor(mixed, ['USD'], 'ARS')).toEqual(['ARS', 'EUR', 'USD']);
  });

  // D6: lo más probable primero — la principal de la cuenta es el caso del 95% de las veces.
  it('ordena: principal de la cuenta, sub-balances, configuradas, favorita', () => {
    const usdAccount = {
      currency: 'USD',
      balances: [
        { currency: 'USD', balance: 100 },
        { currency: 'BRL', balance: 50 },
      ],
    };
    expect(currencyOptionsFor(usdAccount, ['EUR'], 'ARS')).toEqual(['USD', 'BRL', 'EUR', 'ARS']);
  });

  it('sin duplicados y normalizando a mayúsculas', () => {
    expect(currencyOptionsFor(arsAccount, ['ars', 'usd', 'USD'], 'ars')).toEqual(['ARS', 'USD']);
  });

  it('sin cuenta elegida: solo las configuradas y la favorita', () => {
    expect(currencyOptionsFor(undefined, ['USD'], 'ARS')).toEqual(['USD', 'ARS']);
  });

  it('tolera balances null (cuenta recién creada)', () => {
    expect(currencyOptionsFor({ currency: 'ARS', balances: null }, ['USD'], 'ARS')).toEqual([
      'ARS',
      'USD',
    ]);
  });
});
