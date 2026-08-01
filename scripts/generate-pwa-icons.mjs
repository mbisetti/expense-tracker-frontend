// Genera los 5 PNG de `public/pwa/` (íconos de instalación de la PWA, S35).
//
// NO entra al build ni a `npm run build`: es un script suelto que se corre a mano cuando
// cambia el arte. `sharp` tampoco queda en package.json — se instala al vuelo:
//
//   npm i -D sharp --no-save && node scripts/generate-pwa-icons.mjs
//
// Los íconos son PROVISIONALES (D1 del spec): derivan del glifo del mango de
// `public/favicon.svg`. Cuando caiga la decisión NOMBRE, se cambia el arte de acá,
// se vuelve a correr y se regeneran los mismos 5 paths — gracias a `id: "/"` en el
// manifest, las instalaciones existentes se actualizan solas.

import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'pwa')

const BRAND = '#4F46E5'

// Los dos paths del mango, copiados tal cual de public/favicon.svg (sistema de
// coordenadas del viewBox 32×32, SIN el translate que trae el favicon).
const GLYPH = `
  <path
    d="M15.9 6.8c1.3-1 2.9-1.7 4.7-1.6-.1 1.3-.7 2.5-1.6 3.5 2.3 2.1 3.5 5.2 3.3 8.7-.3 6.3-4.7 11.3-9.6 11.3-5.7 0-10.1-4.7-10.1-10.5 0-5.5 3.9-11.1 9.1-12 1.6-.3 3.1 0 4.2.6Z"
    fill="#F59E0B"
  />
  <path
    d="M24 4.9c.4-1.2.4-2.4.1-3.3-1.2.4-2.3 1.3-2.8 2.5.9 0 1.9.3 2.7.8Z"
    fill="#34D399"
  />
`

// Bounding box del glifo en esas coordenadas (mango + hoja). Se centra a partir de acá
// en vez de reusar el `translate(4 4)` del favicon, que a 32px pasa desapercibido pero a
// 512 deja el mango descentrado y con la base cortada.
const BOX = { x: 2.6, y: 1.6, w: 21.5, h: 27.2 }

// `fit` = fracción del lado que ocupa el lado mayor del glifo.
//   any/apple: 0.78, el glifo respira dentro del cuadrado como en el favicon.
//   maskable: 0.62 — safe zone del recorte circular de los launchers (D6). Los launchers
//   pueden comerse hasta el 20% de cada borde, así que el glifo no puede llegar al borde.
function iconSvg({ size, fit, radius }) {
  const scale = (size * fit) / Math.max(BOX.w, BOX.h)
  const tx = size / 2 - scale * (BOX.x + BOX.w / 2)
  const ty = size / 2 - scale * (BOX.y + BOX.h / 2)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND}" />
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})">${GLYPH}</g>
</svg>`
}

const ICONS = [
  // `any`: esquinas redondeadas como el favicon (rx 8 sobre 32 = un cuarto del lado).
  { file: 'icon-192.png', size: 192, fit: 0.78, radius: 48 },
  { file: 'icon-512.png', size: 512, fit: 0.78, radius: 128 },
  // `maskable`: fondo a sangre (el launcher recorta la forma que quiera) + glifo chico.
  { file: 'maskable-192.png', size: 192, fit: 0.62, radius: 0 },
  { file: 'maskable-512.png', size: 512, fit: 0.62, radius: 0 },
  // iOS ignora los íconos del manifest y pinta NEGRO la transparencia: fondo sólido, a
  // sangre (el recorte redondeado lo hace iOS) y sin canal alpha.
  { file: 'apple-touch-icon.png', size: 180, fit: 0.78, radius: 0, opaque: true },
]

await mkdir(OUT_DIR, { recursive: true })

for (const { file, opaque, ...geometry } of ICONS) {
  let pipeline = sharp(Buffer.from(iconSvg(geometry)))
  if (opaque) pipeline = pipeline.flatten({ background: BRAND }).removeAlpha()
  await pipeline.png({ compressionLevel: 9 }).toFile(join(OUT_DIR, file))
  console.log(`✓ public/pwa/${file}  (${geometry.size}×${geometry.size})`)
}
