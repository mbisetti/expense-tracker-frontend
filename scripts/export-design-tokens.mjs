// S44 · Carril B — Exporta la paleta de `src/index.css` a un JSON neutral y a fuentes de
// SwiftUI y Compose.
//
//   node scripts/export-design-tokens.mjs
//
// POR QUÉ: `design-principles.md` es la constitución de diseño del proyecto y dice que los
// VALORES de color son provisionales hasta el informe del hermano de Marko, pero que la
// arquitectura de tokens es una capa swappable y durable. Este script vive de esa promesa: si
// mañana cambia la paleta, se corre de nuevo y las tres salidas quedan al día solas.
//
// PARA QUÉ SIRVE: si algún día se hace una app nativa de verdad (SwiftUI o Compose), la parte
// aburrida y propensa a errores de tipear 60 colores en dos temas ya está hecha y, sobre todo,
// no se puede desincronizar de la web. Y si esa app nunca se hace, no se tiró nada: el JSON
// documenta la paleta para el informe de diseño y para quien tome el proyecto.
//
// SÓLO COLORES a propósito: tipografías, sombras y espaciados no se traducen bien entre CSS,
// SwiftUI y Compose (cada uno tiene su modelo), y traducirlos mal es peor que no traducirlos.
// Para esos, §2 y §3 de design-principles.md siguen siendo la fuente.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'design-tokens');
const css = readFileSync(join(ROOT, 'src', 'index.css'), 'utf8');

/**
 * Devuelve los cuerpos de TODOS los bloques que arrancan en `selector`, concatenados, contando
 * llaves. No alcanza con un regex hasta el primer `}` (el `:root` de la paleta tiene un
 * `@media` anidado adentro), y desde S44 hay más de un bloque `:root` en el archivo (paleta y
 * safe areas): se juntan todos en vez de depender del ORDEN en que estén escritos — el que no
 * tiene colores simplemente no aporta tokens.
 */
function cuerposDelBloque(selector) {
  const cuerpos = [];
  for (let desde = css.indexOf(selector); desde !== -1; desde = css.indexOf(selector, desde + 1)) {
    const abre = css.indexOf('{', desde);
    let profundidad = 0;
    let cerro = false;
    for (let i = abre; i < css.length; i += 1) {
      if (css[i] === '{') profundidad += 1;
      else if (css[i] === '}') {
        profundidad -= 1;
        if (profundidad === 0) {
          cuerpos.push(css.slice(abre + 1, i));
          cerro = true;
          break;
        }
      }
    }
    if (!cerro) throw new Error(`Un bloque "${selector}" no cierra en index.css.`);
  }
  if (!cuerpos.length) throw new Error(`No encontré ningún bloque "${selector}" en index.css`);
  return cuerpos.join('\n');
}

/** `#abc` / `#aabbcc` / `rgba(r,g,b,a)` → {r,g,b,a} en 0-255 y alfa 0-1. Otra cosa → null. */
function parsearColor(valor) {
  const limpio = valor.trim();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(limpio);
  if (hex) {
    const d = hex[1];
    const full = d.length === 3 ? [...d].map((c) => c + c).join('') : d;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgba = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(limpio);
  if (rgba) {
    return {
      r: Math.round(Number(rgba[1])),
      g: Math.round(Number(rgba[2])),
      b: Math.round(Number(rgba[3])),
      a: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }

  return null;
}

/** Sólo las declaraciones `--token: <color>;` de primer nivel del bloque. */
function tokensDeColor(cuerpo) {
  const tokens = {};
  for (const [, nombre, valor] of cuerpo.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    const color = parsearColor(valor);
    if (color) tokens[nombre] = { css: valor.trim(), ...color };
  }
  return tokens;
}

// El tema dark se lee del bloque del TOGGLE MANUAL y no del `@media (prefers-color-scheme)`:
// los dos tienen los mismos valores (§1.1), pero el del toggle tiene un selector estable y
// literal, mientras que el del media query es `:root:not([data-theme='light'])`.
const light = tokensDeColor(cuerposDelBloque(':root {'));
const dark = tokensDeColor(cuerposDelBloque(":root[data-theme='dark']"));

// Cero colores no es "no había": es que cambió el formato de index.css y el parser quedó
// mirando para otro lado. Escribir tres archivos vacíos sin chistar sería mentir.
if (Object.keys(light).length === 0) {
  throw new Error('El bloque :root no dio ningún token de color: ¿cambió el formato de index.css?');
}

// Los tokens del tema oscuro que no existen en el claro serían un bug de la paleta.
const huerfanos = Object.keys(dark).filter((t) => !(t in light));
if (huerfanos.length) {
  console.warn(`Aviso: tokens sólo en dark (¿faltan en light?): ${huerfanos.join(', ')}`);
}

/** `--bg-elevated` → `bgElevated`. */
const camel = (token) =>
  token.replace(/^--/, '').replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

const nombres = Object.keys(light).sort();
const AVISO = `Generado por scripts/export-design-tokens.mjs — NO editar a mano.
Fuente de verdad: src/index.css + design-principles.md. Regenerar: node scripts/export-design-tokens.mjs`;

// ── JSON neutral ────────────────────────────────────────────────────────────────────────
const json = {
  _aviso: AVISO,
  _fuente: 'src/index.css',
  tokens: Object.fromEntries(
    nombres.map((token) => [
      camel(token),
      {
        css: token,
        light: light[token].css,
        // Un token sin variante dark usa el mismo valor en los dos temas (ej. `--text-muted`,
        // que en §1.2 es #78716c en claro y en oscuro).
        dark: (dark[token] ?? light[token]).css,
      },
    ])
  ),
};

// ── SwiftUI ─────────────────────────────────────────────────────────────────────────────
function swiftColor({ r, g, b, a }) {
  const f = (n) => (n / 255).toFixed(4);
  return `Color(.sRGB, red: ${f(r)}, green: ${f(g)}, blue: ${f(b)}, opacity: ${a})`;
}

const swift = `// ${AVISO.split('\n').join('\n// ')}

import SwiftUI

/// Paleta del design system. Un \`Color\` por token que resuelve solo según el tema, igual que
/// las CSS variables en la web: el llamador escribe \`DesignTokens.bg\`, no elige tema.
public enum DesignTokens {
${nombres
  .map(
    (token) => `    /// \`${token}\` — light ${light[token].css} · dark ${(dark[token] ?? light[token]).css}
    public static var ${camel(token)}: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(${swiftColor(dark[token] ?? light[token])})
            : UIColor(${swiftColor(light[token])}) })
    }`
  )
  .join('\n\n')}
}
`;

// ── Compose ─────────────────────────────────────────────────────────────────────────────
function composeColor({ r, g, b, a }) {
  const hex = (n) => n.toString(16).padStart(2, '0').toUpperCase();
  return `Color(0x${hex(Math.round(a * 255))}${hex(r)}${hex(g)}${hex(b)})`;
}

const kotlin = `// ${AVISO.split('\n').join('\n// ')}

package tokens

import androidx.compose.ui.graphics.Color

/** Paleta del tema claro. */
object DesignTokensLight {
${nombres.map((token) => `    /** \`${token}\` — ${light[token].css} */\n    val ${camel(token)} = ${composeColor(light[token])}`).join('\n')}
}

/** Paleta del tema oscuro. Ambos temas son ciudadanos de primera (design-principles.md §0). */
object DesignTokensDark {
${nombres
  .map(
    (token) =>
      `    /** \`${token}\` — ${(dark[token] ?? light[token]).css} */\n    val ${camel(token)} = ${composeColor(dark[token] ?? light[token])}`
  )
  .join('\n')}
}
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'design-tokens.json'), `${JSON.stringify(json, null, 2)}\n`);
writeFileSync(join(OUT_DIR, 'DesignTokens.swift'), swift);
writeFileSync(join(OUT_DIR, 'DesignTokens.kt'), kotlin);

console.log(`${nombres.length} tokens de color exportados a design-tokens/`);
console.log('  · design-tokens.json   (neutral)');
console.log('  · DesignTokens.swift   (SwiftUI)');
console.log('  · DesignTokens.kt      (Compose)');
