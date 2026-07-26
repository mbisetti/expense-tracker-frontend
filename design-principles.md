# Design Principles — "Manguitos" (nombre provisional)

**Sprint 18 · Bloque 1 · Opus 4.8 · Julio 2026 · Estado: APROBADO y en producción desde S18-S19** *(paleta índigo provisional hasta el informe de diseño pendiente)*

> **La constitución de diseño del proyecto.** Todo componente y pantalla se genera contra este doc.
> **Regla anti-frankenstein (S18+):** ningún componente nuevo se crea sin usar los tokens y los componentes base de acá. Vale para el revamp y para toda la Fase 4.
> **Jerarquía sobre `ui-ux-pro-max`:** la skill aporta buenas prácticas genéricas (anti-slop, accesibilidad). Si contradice este doc, **gana este doc**. La skill nunca define identidad.

---

## 0. Decisiones de identidad (Marko, 2026-07-15)

- **Nombre:** TBD (se decide antes de la landing, S19). Placeholder: "Finanzas".
- **Tema:** light y dark **ambos ciudadanos de primera** (sin "first"). Cada token tiene valor para los dos. Estrategia: seguir `prefers-color-scheme` **+ toggle manual** (`data-theme` en el root que pisa al sistema).
- **Tono:** **sobrio con acentos cálidos** — es plata personal, no un banco ni un juguete. Base neutra seria + un acento cálido para energía/humanidad. **[DECISIÓN DURABLE — aprobada]**

> ### ⚠️ Estado: paleta y tipografía PROVISIONALES
> Marko pidió un informe a su hermano (diseñador gráfico/multimedia) que puede redefinir la dirección visual — **de ahí puede salir otra paleta/tipografía o incluso otro revamp.** Por eso:
> - **DURABLE y cerrado** (independiente del color): tono (§0), arquitectura de tokens como capa swappable (§1.1), semánticos sagrados como concepto (§1.4), regla chrome↔dato (§1.5), accesibilidad (§4), patrones de feedback (§5), `tabular-nums` + `formatMoney` (§2), cero Google Fonts (§2), escala 4px (§3), reglas de generación (§7).
> - **PROVISIONAL** (a confirmar/reemplazar con el informe): los **valores** concretos de color (§1.2–1.4) y la familia tipográfica de marca (§2). El índigo/stone son un **default de trabajo**, trivial de swapear en `index.css` (una capa) sin tocar componentes.
> - **El build de componentes espera la dirección visual** (o el OK de Marko para arrancar sobre el default provisional). El plan además prohíbe migrar pantallas en S18.

---

## 1. Color

### 1.1 Estrategia de tema (light + dark, ambos primera)
Los tokens semánticos se definen como **CSS variables** en `:root` (light) y se re-mapean en `@media (prefers-color-scheme: dark)` **y** en `:root[data-theme="dark"]` / `[data-theme="light"]` (para un toggle manual que pise el sistema). Tailwind v4 `@theme inline` mapea los utilities a esas vars (ya es el patrón del proyecto — **se extiende, no se reemplaza por un `tailwind.config`**, porque es Tailwind v4 utilities-only).

**Nunca un color crudo (hex/rgb) en un componente.** Sólo tokens. (Excepción: el color elegible por el usuario para una categoría, que es dato, no chrome.)

### 1.2 Neutros cálidos (base sobria) — familia "stone" tibia, no gris puro ni blanco puro
| Token | Rol | Light | Dark |
|-------|-----|-------|------|
| `surface` | fondo de app | `#FAFAF9` (off-white cálido, no `#fff`) | `#0C0A09` |
| `surface-elevated` | cards, modales | `#FFFFFF` | `#1C1917` |
| `surface-sunken` | inputs, wells | `#F5F5F4` | `#141210` |
| `ink` | texto principal / headings | `#1C1917` | `#FAFAF9` |
| `body` | texto secundario | `#57534E` | `#A8A29E` |
| `muted` | texto terciario / placeholder | `#78716C` | `#78716C` |
| `line` | bordes, divisores | `#E7E5E4` | `rgba(250,250,249,0.10)` |

### 1.3 Acento de marca — **índigo** (acción primaria, distinto de los semánticos)
| Token | Light | Dark |
|-------|-------|------|
| `brand` | `#4F46E5` | `#818CF8` |
| `brand-hover` | `#4338CA` | `#A5B4FC` |
| `brand-bg` | `rgba(79,70,229,0.08)` | `rgba(129,140,248,0.14)` |
| `on-brand` | `#FFFFFF` (blanco, ~5.9:1 AA) | `#1C1917` (~6.2:1 AA) |

Índigo lee como "marca / acción primaria", **no como alerta**. **Corrección de Marko (2026-07-15):** la terracota provisional se confundía con warning/danger — el naranja es culturalmente un color de precaución y cae justo entre el rojo `expense` y el ámbar `warning`. Como los semánticos ocupan verde/rojo/ámbar/azul, el único hueco limpio para la marca es índigo/violeta. **La calidez del tono la dan los neutros "stone", no el acento.** (Sigue provisional hasta el informe del hermano de Marko.)

### 1.4 Semánticos financieros — **SAGRADOS: mismo significado en TODA la app**
| Token | Significado | Light | Dark |
|-------|-------------|-------|------|
| `income` | ingreso / positivo | `#047857` | `#34D399` |
| `expense` | gasto / negativo | `#DC2626` | `#F87171` |
| `transfer` | transferencia (movimiento neutro) | `#0284C7` | `#38BDF8` |
| `warning` | presupuesto cerca del límite | `#B45309` | `#FBBF24` |
| `exceeded` | presupuesto excedido | `#B91C1C` | `#FCA5A5` |

### 1.5 Regla de separación chrome ↔ dato (evita colisiones de color)
- El **acento de marca (índigo)** se usa SÓLO en **chrome interactivo**: botón primario, links, tab activo, focus ring. **Nunca en montos ni en estados financieros.**
- Los **semánticos** se usan SÓLO en **datos y estados**: montos, badges de estado, barras. **Nunca en chrome.**
- El índigo (marca) es un **hue distinto** de todos los semánticos (verde/rojo/ámbar/azul-celeste), así que no se confunde con ningún estado financiero; y además nunca aparece en el rol de un monto/estado.
- **El color NUNCA comunica solo** (WCAG): todo estado lleva ícono + label además del color. Un `Amount` negativo lleva signo `−`, no sólo rojo.

### 1.6 Contraste (AA, no negociable en app financiera)
Texto normal ≥ **4.5:1**, texto grande/UI ≥ 3:1. `ink`/`body` sobre `surface` cumplen holgado en ambos temas. Los semánticos se validan sobre `surface` y `surface-elevated`. Verificar cada par en el Bloque 2 (checker) antes de tokenizar.

---

## 2. Tipografía

- **Familia:** **system stack** (`system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`). **Cero Google Fonts** (privacidad + latencia + la landing debe ser liviana). Si más adelante se quiere carácter de marca, una **variable font auto-hosteada** (self-hosted), nunca un CDN de fuentes.
- **Escala** (rem, base 16px): `xs 12 / sm 14 / base 16 / lg 20 / xl 24 / 2xl 32`, con line-heights: body 1.5, headings 1.2, montos 1.1.
- **Montos y tablas:** `font-variant-numeric: tabular-nums` **obligatorio** en todo número (monto, tabla, fecha numérica). Es la diferencia entre app financiera seria y de juguete.
- **Moneda:** un único helper `formatMoney(amount, currency)` (ya existe en `lib/money.ts`) — con signo y, en el componente `Amount`, color semántico. Nunca formatear a mano.

---

## 3. Espaciado, radios, sombras

- **Espaciado — escala 4px:** `1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32 · 10=40 · 12=48`. Nada de `px` sueltos en componentes (la escala de Tailwind ya la respeta; prohibido `[13px]` y afines).
- **Radios:** `sm 6px` (inputs, badges) · `md 10px` (cards, botones) · `lg 16px` (modales) · `full` (pills, avatares).
- **Sombras (sutiles, sobrias):** `sm` (hover de card) · `md` (dropdown/popover) · `lg` (modal). En dark las sombras casi no se ven → la elevación se comunica con `surface-elevated` + `line`, no con sombra.

---

## 4. Accesibilidad (mínimos duros — app de plata)

- Contraste AA (§1.6). Focus **siempre visible** (ring de 2px con `brand`, `outline-offset`). Nunca `outline: none` sin reemplazo.
- **Touch targets ≥ 44×44px** (mobile-first, el uso real es el teléfono).
- Todo input con **label visible** (no placeholder-as-label). Error cerca del campo, no sólo arriba.
- `prefers-reduced-motion`: respetado (transiciones 150–300ms, se anulan si el usuario lo pide).
- Iconografía: **SVG (Lucide), nunca emojis como iconos.**

---

## 5. Patrones de feedback (un patrón por situación, igual en toda la app)

Hoy están dispersos (21 pantallas resuelven el error a su manera, 4 confirman borrado inline). Se unifican con los componentes del Bloque 3 (`src/components/ui/`):

- **Loading → `Skeleton`.** Variantes `text` / `card` / `list` (N filas vía `rows`) / `chart`, con la forma del contenido que va a aparecer — nunca layout shift ni un spinner a pantalla completa. `role="status"` + `aria-label="Cargando…"` (el loading se anuncia una vez, no fila por fila). `animate-pulse` sobre `surface-sunken`, anulado con `motion-reduce:animate-none`.
- **Error de server → `Toast` + estado local.** `ToastProvider` (contexto) se monta una vez en la raíz (S19); cualquier pantalla llama `useToast().error(mensaje)` en el `onError` de su mutación — un solo componente para todo error de mutación, se acabaron los 21 manejos ad-hoc. `role="alert"` (error) vs `role="status"` + `aria-live="polite"` (success), auto-dismiss ~4s, descartable a mano, apilable. El estado local de la vista (ej. no limpiar un form si falla) sigue siendo responsabilidad de la pantalla; el Toast es sólo la notificación.
- **Lista vacía → `EmptyState`.** Ilustración inline (SVG, nunca emoji) + título + mensaje opcional + CTA opcional (`Button`). Nunca una vista en blanco ni una tabla con cero filas sin contexto.
- **Confirmación destructiva → `ConfirmDialog`.** Wrapper de `Modal` con contrato fijo (`title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`, `danger?`, `loading?`); `danger` pinta el botón de confirmar con `variant="danger"` (`bg-expense`, la única excepción admitida a la regla chrome↔dato — ver comentario en `Button.tsx`). **Reemplaza** los "¿Borrar? Sí/No" inline de Accounts/Categories/PaymentMethods/Transactions. `Modal` en sí (focus trap, Esc, backdrop-click, foco de vuelta al trigger) es reutilizable para diálogos no destructivos (ej. edición rápida).

---

## 6. Movimiento

Transiciones 150–300ms, `ease-out` para entradas. El movimiento comunica (aparición de toast, apertura de modal, cambio de estado), nunca decorativo. Respeta `prefers-reduced-motion`.

---

## 7. Reglas de generación (para prompts de UI de la Fase 4)

1. Este doc es **input obligatorio** de todo prompt que genere UI.
2. Un componente = un archivo en `src/components/ui/`. Variantes por props, no por copia.
3. Cero hex hardcodeado (grep de verificación en la migración: `#[0-9a-fA-F]{3,6}` en `src/features/` → 0 fuera de tokens).
4. Mobile-first: base = mobile, `md` = tablet, `lg` = desktop.
5. `ui-ux-pro-max` se consulta como checklist anti-slop y heurística — **subordinada a este doc**.

---

## 8. Inventario del "antes" (auditoría S18-B1) → checklist de migración S19

- **Marca de template** (`#aa3bff` morado, `code-bg`/`social-bg`/sombra genéricos) → reemplazar por los tokens de acá.
- **Faltan tokens** de espaciado/radio/sombra/escala tipográfica → §2-3.
- **Feedback disperso** (21 error ad-hoc, 15 loading mixto, 4 confirmaciones inline) → §5.
- **Librería mínima** (5 componentes: AppLayout, BottomNav, Card, ProgressBar, SectionPlaceholder) → construir la librería base (B2/B3).
- **9 pantallas** a migrar (S19): Dashboard, Transactions, Accounts, Income, Transfers, Categories, PaymentMethods, Login, Register.
- **Bueno de base:** hex hardcodeado ≈ 0, ya hay tokens semánticos income/expense/warning y dark mode por `prefers-color-scheme`.
