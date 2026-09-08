import type { Category, CategoryType } from './api';

// S48 (D4/D5): colores DISTINTOS, no aleatorios. Aleatorio puro con 15 categorías da dos verdes
// casi iguales, que es exactamente el problema que motivó el sprint. Acá los n matices salen
// equidistantes en la rueda y el offset se elige contra los "fijos" (lo que se grafica junto y
// no se recolorea); la aleatoriedad queda en el offset y en el barajado, que es lo que hace que
// "Mezclar de nuevo" se sienta distinto sin que nada se parezca.
//
// Todo puro: sin React, sin fetch. `rng` es inyectable para que los tests sean deterministas.

export type Rng = () => number;

export type Hsl = { h: number; s: number; l: number };

// Por debajo de esta saturación un color es gris y su matiz no significa nada: no vale la pena
// esquivarlo (Otros #ADB5BD está en 0,11; Comisiones #8D99AE, un gris azulado, en 0,17).
const GREY_SATURATION = 0.2;
// Saturación y luminosidad fijas: el color es un hex guardado (dato, no chrome) y tiene que
// leer bien sobre claro y oscuro con el mismo valor.
const SATURATION = 0.62;
const LIGHTNESS = 0.5;
// Con muchas categorías dos matices vecinos se acercan; alternar luminosidad los separa también
// por claridad.
const MANY = 12;
const LIGHTNESS_ALT = [0.44, 0.58];
const OFFSET_SAMPLES = 24;

export function hexToHsl(hex: string): Hsl | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60) % 360, s, l };
}

// Minúscula a propósito: <input type=color> normaliza a minúscula, y si emitiéramos mayúscula el
// form creería que tocaste el picker cuando no.
export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function circularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Matices con los que vale la pena no chocar: descarta null, no parseables y grises. */
export function fixedHues(hexes: (string | null | undefined)[]): number[] {
  const out: number[] = [];
  for (const hex of hexes) {
    if (!hex) continue;
    const hsl = hexToHsl(hex);
    if (!hsl || hsl.s < GREY_SATURATION) continue;
    out.push(hsl.h);
  }
  return out;
}

/** Centro del hueco circular más grande entre los matices dados. Exacto, sin muestreo. */
function largestGapCenter(hues: number[]): number {
  const sorted = [...hues].sort((a, b) => a - b);
  let bestStart = sorted[sorted.length - 1];
  let bestGap = sorted[0] + 360 - bestStart;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > bestGap) {
      bestGap = gap;
      bestStart = sorted[i - 1];
    }
  }
  return (bestStart + bestGap / 2) % 360;
}

function minDistanceToFixed(offset: number, n: number, step: number, fixed: number[]): number {
  let min = Infinity;
  for (let i = 0; i < n; i++) {
    const hue = (offset + i * step) % 360;
    for (const f of fixed) min = Math.min(min, circularDistance(hue, f));
  }
  return min;
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * n colores que no se parecen entre sí ni a los fijos. Los fijos son los hex de lo que se
 * grafica junto con lo que se recolorea (ver chartedWith / fixedTypesFor).
 */
export function assignDistinctColors(
  fixedHexes: (string | null | undefined)[],
  n: number,
  rng: Rng,
): string[] {
  if (n <= 0) return [];
  const fixed = fixedHues(fixedHexes);
  const step = 360 / n;
  let offset: number;
  if (fixed.length === 0) {
    offset = rng() * step;
  } else if (n === 1) {
    // El caso del alta: un solo color, en el centro del hueco más grande. Exacto.
    offset = largestGapCenter(fixed);
  } else {
    // Se prueban OFFSET_SAMPLES corrimientos dentro de un paso y se elige el que maximiza la
    // distancia mínima a cualquier fijo. Empate: el primero.
    const jitter = (rng() * step) / OFFSET_SAMPLES;
    let best = -1;
    offset = 0;
    for (let k = 0; k < OFFSET_SAMPLES; k++) {
      const candidate = (k * step) / OFFSET_SAMPLES + jitter;
      const score = minDistanceToFixed(candidate, n, step, fixed);
      if (score > best) {
        best = score;
        offset = candidate;
      }
    }
  }
  const colors: string[] = [];
  for (let i = 0; i < n; i++) {
    const hue = (offset + i * step) % 360;
    const l = n > MANY ? LIGHTNESS_ALT[i % 2] : LIGHTNESS;
    colors.push(hslToHex(hue, SATURATION, l));
  }
  // Barajado: la lista no sigue el orden de la rueda, y "Mezclar de nuevo" se siente distinto.
  return shuffle(colors, rng);
}

/** Los tipos que se grafican junto con `type`: el donut de Gastos mezcla EXPENSE y BOTH. */
export function chartedWith(type: CategoryType): CategoryType[] {
  if (type === 'BOTH') return ['EXPENSE', 'INCOME', 'BOTH'];
  return [type, 'BOTH'];
}

/** Al reasignar una sección, lo que se esquiva: lo graficado junto, menos la sección misma. */
export function fixedTypesFor(section: CategoryType): CategoryType[] {
  return chartedWith(section).filter((t) => t !== section);
}

/** D5: el color propuesto para una categoría nueva de `type`. */
export function suggestColorFor(
  type: CategoryType,
  categories: Category[] | undefined,
  rng: Rng = Math.random,
): string {
  const charted = chartedWith(type);
  const fixed = (categories ?? []).filter((c) => charted.includes(c.type)).map((c) => c.color);
  return assignDistinctColors(fixed, 1, rng)[0];
}
