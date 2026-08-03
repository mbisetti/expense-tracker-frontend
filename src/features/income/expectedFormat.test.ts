import { describe, expect, it } from 'vitest';
import { expectedStateBadge } from './expectedFormat';

// El chip es lo único que le dice al usuario si tiene que hacer algo, así que los cuatro
// estados se prueban acá y no a través del render.
describe('expectedStateBadge', () => {
  it('cargado cuando ya entraron todas las ocurrencias del mes', () => {
    expect(expectedStateBadge({ expectedCount: 1, receivedCount: 1, billingDay: 5 }, 15))
      .toEqual({ status: 'ok', label: 'Cargado' });
  });

  it('un extra por encima de lo esperado sigue siendo cargado, no rompe el chip', () => {
    expect(expectedStateBadge({ expectedCount: 1, receivedCount: 2, billingDay: 5 }, 15))
      .toEqual({ status: 'ok', label: 'Cargado' });
  });

  it('ambar solo cuando no entro NADA y el dia de cobro ya paso', () => {
    expect(expectedStateBadge({ expectedCount: 1, receivedCount: 0, billingDay: 5 }, 15))
      .toEqual({ status: 'warning', label: 'Sin cargar' });
  });

  it('gris mientras el dia de cobro no llego', () => {
    expect(expectedStateBadge({ expectedCount: 1, receivedCount: 0, billingDay: 20 }, 15))
      .toEqual({ status: 'pending', label: 'Pendiente' });
  });

  it('el parcial queda en gris aunque el dia ya haya pasado', () => {
    // Una quincenal con la primera cobrada el 5 no es una alarma el 6: pintarla de ambar
    // apenas entra el primer cobro convierte el chip en ruido.
    expect(expectedStateBadge({ expectedCount: 2, receivedCount: 1, billingDay: 5 }, 15))
      .toEqual({ status: 'pending', label: 'Parcial 1/2' });
  });

  it('anual fuera de su mes no reclama nada', () => {
    expect(expectedStateBadge({ expectedCount: 0, receivedCount: 0, billingDay: 10 }, 15))
      .toEqual({ status: 'info', label: 'No vence este mes' });
  });
});
