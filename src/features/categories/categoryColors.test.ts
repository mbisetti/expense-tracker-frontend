import { describe, expect, it } from 'vitest';
import {
  assignDistinctColors,
  circularDistance,
  fixedHues,
  hexToHsl,
  hslToHex,
  suggestColorFor,
} from './categoryColors';
import type { Category } from './api';

// LCG chiquito: misma semilla, misma secuencia. Los tests no dependen de Math.random.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hueOf(hex: string): number {
  const hsl = hexToHsl(hex);
  if (!hsl) throw new Error(`no parsea: ${hex}`);
  return hsl.h;
}

// El redondeo a 8 bits por canal mueve el matiz un par de grados: se compara con tolerancia.
function expectHueNear(hex: string, hue: number) {
  expect(circularDistance(hueOf(hex), hue)).toBeLessThan(3);
}

function minPairwiseDistance(hexes: string[]): number {
  let min = Infinity;
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      min = Math.min(min, circularDistance(hueOf(hexes[i]), hueOf(hexes[j])));
    }
  }
  return min;
}

function cat(id: string, type: Category['type'], color: string | null): Category {
  return {
    id,
    userId: 'u',
    name: id,
    type,
    color,
    icon: null,
    isEssential: false,
    sourceDefaultCategoryId: null,
    createdAt: '2026-07-01T00:00:00',
  };
}

describe('categoryColors', () => {
  it('hex ↔ hsl van y vuelven, en minúscula y de 7', () => {
    expect(hslToHex(0, 1, 0.5)).toBe('#ff0000');
    expect(hslToHex(120, 1, 0.5)).toBe('#00ff00');
    expect(hslToHex(240, 1, 0.5)).toBe('#0000ff');
    expect(hexToHsl('#FF0000')).toEqual({ h: 0, s: 1, l: 0.5 });
    expect(hexToHsl('rojo')).toBeNull();
    expect(hslToHex(hueOf('#2a78d6'), 0.62, 0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('n colores quedan a 360/n unos de otros', () => {
    for (const n of [2, 5, 8, 14]) {
      const colors = assignDistinctColors([], n, seeded(7));
      expect(colors).toHaveLength(n);
      colors.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/));
      expect(minPairwiseDistance(colors)).toBeGreaterThan(360 / n - 3);
    }
  });

  it('con fijos, los nuevos caen lejos de ellos (0° y 180° → 90° y 270°)', () => {
    const colors = assignDistinctColors(['#ff0000', '#00ffff'], 2, () => 0);
    const hues = colors.map(hueOf).sort((a, b) => a - b);
    expect(circularDistance(hues[0], 90)).toBeLessThan(3);
    expect(circularDistance(hues[1], 270)).toBeLessThan(3);
  });

  it('n = 1 cae en el centro del hueco más grande (0°, 90°, 180° → 270°)', () => {
    const [color] = assignDistinctColors(['#ff0000', '#80ff00', '#00ffff'], 1, () => 0.9);
    expectHueNear(color, 270);
  });

  it('los grises no cuentan como fijos', () => {
    expect(fixedHues(['#8d99ae', '#adb5bd', null, undefined, 'rojo'])).toEqual([]);
    // Sin fijos, n = 1 es un matiz al azar: rng 0.25 → 90°. Si los grises contaran, caería
    // en el centro del hueco que dejan (cerca de 30°).
    const [color] = assignDistinctColors(['#8d99ae', '#adb5bd'], 1, () => 0.25);
    expectHueNear(color, 90);
  });

  it('misma semilla, misma salida; el barajado conserva el conjunto', () => {
    const a = assignDistinctColors(['#ff0000'], 6, seeded(42));
    const b = assignDistinctColors(['#ff0000'], 6, seeded(42));
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(6);
  });

  it('con más de 12 alterna dos luminosidades', () => {
    const colors = assignDistinctColors([], 14, seeded(1));
    const lights = new Set(colors.map((c) => Math.round((hexToHsl(c)?.l ?? 0) * 100)));
    expect(lights.size).toBe(2);
    const few = assignDistinctColors([], 6, seeded(1));
    const fewLights = new Set(few.map((c) => Math.round((hexToHsl(c)?.l ?? 0) * 100)));
    expect(fewLights.size).toBe(1);
  });

  it('suggestColorFor esquiva lo que se grafica junto con el tipo', () => {
    const categories = [
      cat('e', 'EXPENSE', '#ff0000'), // 0°
      cat('b', 'BOTH', '#00ff00'), // 120°
      cat('i', 'INCOME', '#0000ff'), // 240°
    ];
    // Gasto: fijos 0° y 120° → hueco grande 120°→360°, centro 240°.
    expectHueNear(suggestColorFor('EXPENSE', categories, () => 0), 240);
    // Ingreso: fijos 120° y 240° → centro 0° (el hueco que cruza el 360).
    expectHueNear(suggestColorFor('INCOME', categories, () => 0), 0);
    // Ambos: los tres fijos, a 120° cada uno → cualquier centro está a 60° de dos de ellos.
    const both = hueOf(suggestColorFor('BOTH', categories, () => 0));
    for (const f of [0, 120, 240]) expect(circularDistance(both, f)).toBeGreaterThan(55);
    // Sin categorías: no explota.
    expect(suggestColorFor('EXPENSE', undefined, () => 0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
