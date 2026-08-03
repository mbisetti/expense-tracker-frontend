import type { AppliedDeduction, DeductionType } from './api';

// Lo único que el cálculo necesita. S36: así el preview sirve tanto para las deducciones VIVAS de
// la fuente (alta) como para el SNAPSHOT de una entry ya cargada (edición) — que es contra lo que
// el backend recalcula al editar, para no reescribirle la historia a un cobro viejo.
type DeductionSpec = { name: string; type: DeductionType; value: number };

// Redondeo a 2 decimales HALF_UP — espeja el DeductionCalculator del backend para el
// preview en vivo. El backend es la fuente de verdad; esto es solo UX.
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type NetPreview = {
  lines: AppliedDeduction[];
  calculatedNet: number;
};

// Mismo criterio que el backend: PERCENTAGE sobre el bruto original, cada applied_amount
// redondeado antes de sumar.
export function previewNet(gross: number, deductions: DeductionSpec[]): NetPreview {
  const g = round2(gross);
  let total = 0;
  const lines: AppliedDeduction[] = deductions.map((d) => {
    const applied = d.type === 'PERCENTAGE' ? round2((g * d.value) / 100) : round2(d.value);
    total = round2(total + applied);
    return { name: d.name, type: d.type, value: d.value, appliedAmount: applied };
  });
  return { lines, calculatedNet: round2(g - total) };
}
