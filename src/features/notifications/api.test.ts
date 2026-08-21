import { describe, expect, it } from 'vitest';
import { targetPath, type NotificationItem } from './api';

// El back no conoce rutas del front: manda el tipo de destino y acá se traduce. Este test existe
// para que un destino nuevo no rompa en silencio a los viejos (S39 §8.8).

function item(
  targetType: NotificationItem['targetType'],
  targetId: string | null = null,
): NotificationItem {
  return {
    id: 'n1',
    type: 'BOT_IMPORT',
    title: 'Thoth cargó resumen-visa.pdf · 42 movimientos',
    body: 'Quedaron en Por revisar.',
    targetType,
    targetId,
    createdAt: '2026-08-04T10:00:00',
    read: false,
  };
}

describe('targetPath', () => {
  it('S39: REVIEW_INBOX abre la bandeja de Transacciones', () => {
    // El targetId es el batch, que no tiene vista propia: lo que se abre es la cola.
    expect(targetPath(item('REVIEW_INBOX', 'batch-1'))).toBe('/transactions?review=1');
    expect(targetPath(item('REVIEW_INBOX'))).toBe('/transactions?review=1');
  });

  it('los destinos viejos siguen donde estaban', () => {
    expect(targetPath(item('TRANSACTION', 'tx-1'))).toBe('/transactions?edit=tx-1');
    expect(targetPath(item('TRANSACTION'))).toBe('/transactions');
    expect(targetPath(item('BUDGETS'))).toBe('/dashboard');
    expect(targetPath(item('SAVINGS'))).toBe('/dashboard');
    expect(targetPath(item('RECURRING'))).toBe('/expenses#recurrentes');
    expect(targetPath(item('SHARED'))).toBe('/expenses#compartidos');
    expect(targetPath(item('CARD'))).toBe('/accounts');
    expect(targetPath(item('INCOME', 'src-1'))).toBe('/income?confirm=src-1');
    expect(targetPath(item('EXPENSES'))).toBe('/expenses');
  });

  it('S40: ACCOUNT lleva a Cuentas, con o sin id (la cuenta no tiene permalink propio)', () => {
    // Lo usa LOAN_DUE: el id es la cuenta del préstamo, y lo que hay que abrir es la pantalla
    // donde está su card con la barra de progreso.
    expect(targetPath(item('ACCOUNT', 'acc-1'))).toBe('/accounts');
    expect(targetPath(item('ACCOUNT'))).toBe('/accounts');
  });

  it('sin destino no lleva a ningún lado', () => {
    expect(targetPath(item(null))).toBeNull();
  });
});
