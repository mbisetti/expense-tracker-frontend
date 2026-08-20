// S44 — Renombra el appId (package name de Android / bundle id de iOS) en TODOS los lugares
// donde Capacitor lo deja escrito.
//
//   node scripts/set-app-id.mjs com.elnombre.app
//
// Por qué existe: el appId vive en NUEVE archivos más el nombre de un directorio de Java.
// Cambiarlo a mano es garantía de dejar uno atrás, y el síntoma no es un error de compilación
// sino una app que instala mal o un deep link que no vuelve. Peor: el package name de Google
// Play es INMUTABLE una vez publicada la app (roadmap.md, riesgo #3), así que este cambio se
// hace UNA vez y tiene que salir bien.
//
// Se corre cuando caiga la decisión NOMBRE, que hoy es el bloqueador №1 del roadmap. Después
// de correrlo: `npx cap sync` y rebuild.

import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync, rmdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Palabras reservadas de Java: un segmento así compila mal el package de MainActivity.
const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
  'volatile', 'while', 'true', 'false', 'null',
]);

function validar(appId) {
  const segmentos = appId.split('.');
  if (segmentos.length < 2) {
    throw new Error(`"${appId}" necesita al menos dos segmentos (ej: com.elnombre.app).`);
  }
  for (const segmento of segmentos) {
    if (!/^[a-z][a-z0-9_]*$/.test(segmento)) {
      throw new Error(
        `Segmento inválido: "${segmento}". Van en minúscula, arrancan con letra y sólo llevan letras, números o guión bajo.`
      );
    }
    if (JAVA_KEYWORDS.has(segmento)) {
      throw new Error(`Segmento "${segmento}" es palabra reservada de Java y no compila.`);
    }
  }
}

function leerIdActual() {
  const config = readFileSync(join(ROOT, 'capacitor.config.ts'), 'utf8');
  const match = /CAP_APP_ID \?\? '([^']+)'/.exec(config);
  if (!match) throw new Error('No pude leer el appId actual de capacitor.config.ts.');
  return match[1];
}

/** Reemplaza en un archivo si existe. Devuelve si tocó algo (para el reporte final). */
function reemplazar(rutaRelativa, viejo, nuevo) {
  const ruta = join(ROOT, rutaRelativa);
  if (!existsSync(ruta)) return false;
  const antes = readFileSync(ruta, 'utf8');
  const despues = antes.split(viejo).join(nuevo);
  if (antes === despues) return false;
  writeFileSync(ruta, despues);
  return true;
}

/**
 * Mueve el directorio del paquete de Java (`app/manguitos/provisional` → `com/elnombre/app`).
 * No alcanza con cambiar el `package` de MainActivity.java: en Java la ruta del archivo TIENE
 * que reflejar el paquete, o el build falla con "class is public, should be declared in a file
 * named...". Es justo el paso que se olvida al renombrar a mano.
 */
function moverPaqueteJava(viejo, nuevo) {
  const base = join(ROOT, 'android', 'app', 'src', 'main', 'java');
  if (!existsSync(base)) return false;

  const rutaVieja = join(base, ...viejo.split('.'));
  const rutaNueva = join(base, ...nuevo.split('.'));
  if (!existsSync(rutaVieja) || rutaVieja === rutaNueva) return false;

  mkdirSync(dirname(rutaNueva), { recursive: true });
  renameSync(rutaVieja, rutaNueva);

  // Limpia los directorios que quedaron vacíos del paquete viejo (`app/manguitos/`), de abajo
  // hacia arriba, sin pasarse de `java/`. `rmdirSync` y no `rmSync`: borra sólo directorios
  // VACÍOS y tira en cuanto uno tiene contenido, que es justo el corte buscado (`rmSync` sin
  // `recursive` rechaza cualquier directorio, hasta los vacíos, así que no limpiaría nunca).
  let huerfano = dirname(rutaVieja);
  while (huerfano !== base) {
    try {
      rmdirSync(huerfano);
    } catch {
      break; // Todavía tiene contenido: no es nuestro para borrar.
    }
    huerfano = dirname(huerfano);
  }
  return true;
}

const nuevo = process.argv[2];
if (!nuevo) {
  console.error('Uso: node scripts/set-app-id.mjs <nuevo.app.id>');
  console.error('Ejemplo: node scripts/set-app-id.mjs com.elnombre.app');
  process.exit(1);
}

// Los errores de validación salen como un mensaje y nada más: un stack trace de Node acá no
// le dice nada a nadie, el problema siempre es el argumento que se tipeó.
let viejo;
try {
  validar(nuevo);
  viejo = leerIdActual();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

if (viejo === nuevo) {
  console.log(`El appId ya es "${nuevo}". No hay nada que hacer.`);
  process.exit(0);
}

const tocados = [
  'capacitor.config.ts',
  'android/app/build.gradle',
  'android/app/src/main/assets/capacitor.config.json',
  'android/app/src/main/res/values/strings.xml',
  `android/app/src/main/java/${viejo.split('.').join('/')}/MainActivity.java`,
  'ios/App/App/capacitor.config.json',
  'ios/App/App.xcodeproj/project.pbxproj',
].filter((archivo) => reemplazar(archivo, viejo, nuevo));

// El MainActivity.java se renombró recién, así que el move va DESPUÉS del reemplazo de texto.
if (moverPaqueteJava(viejo, nuevo)) {
  tocados.push(`android/app/src/main/java/… (${viejo} → ${nuevo})`);
}

console.log(`appId: ${viejo} → ${nuevo}`);
for (const archivo of tocados) console.log(`  · ${archivo}`);
console.log('\nAhora corré `npx cap sync` y volvé a compilar.');
console.log('OJO: si la app YA está publicada en Google Play, el package name no se puede cambiar.');
