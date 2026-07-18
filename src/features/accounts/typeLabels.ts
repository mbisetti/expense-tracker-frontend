import type { AccountType } from './api';

// Sprint 22.2: etiquetas es-AR de los 7 tipos vehículo (compartidas por la card y el form).
export const TYPE_LABELS: Record<AccountType, string> = {
  CASH: 'Efectivo',
  BANK: 'Banco',
  WALLET: 'Billetera virtual',
  INVESTMENT: 'Inversiones',
  CRYPTO: 'Cripto',
  CREDIT: 'Tarjeta de crédito',
  DEBT: 'Deuda',
};
