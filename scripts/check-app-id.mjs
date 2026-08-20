// S44 — Guard del appId. Corre en CI y a mano (`npm run app:check-id`).
//
// Chequea DOS cosas distintas:
//
// 1. CONSISTENCIA (bloqueante). El appId está escrito en nueve archivos y en el nombre de un
//    directorio de Java. Que se desincronicen no da error de compilación: da una app que
//    instala mal, o un deep link de OAuth que no vuelve nunca. Los síntomas aparecen lejos de
//    la causa, que es la definición de un buen guard.
//
// 2. PROVISIONALIDAD (informativo). Mientras el id diga `provisional`, la app no se puede
//    publicar: el package name de Google Play es INMUTABLE post-publicación y el NOMBRE del
//    producto todavía no se decidió. Avisa, no bloquea — el build de debug es legítimo así.
//
// Se arregla con `npm run app:id -- <nuevo.id>` + `npx cap sync`.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function leer(rutaRelativa) {
  const ruta = join(ROOT, rutaRelativa);
  return existsSync(ruta) ? readFileSync(ruta, 'utf8') : null;
}

/** Cada fuente devuelve `null` si el archivo no existe (proyecto nativo todavía sin generar). */
function extraer(rutaRelativa, regex, todas = false) {
  const contenido = leer(rutaRelativa);
  if (contenido === null) return null;
  if (todas) {
    const encontrados = [...contenido.matchAll(regex)].map((m) => m[1]);
    return encontrados.length ? encontrados : null;
  }
  const match = regex.exec(contenido);
  return match ? [match[1]] : null;
}

/** El paquete de Java se lee del árbol de directorios, no de un archivo: es el que se olvida. */
function paqueteJavaDelDisco() {
  const base = join(ROOT, 'android', 'app', 'src', 'main', 'java');
  if (!existsSync(base)) return null;

  // El paquete es la ruta de MainActivity.java. Se busca el ARCHIVO recorriendo todo el árbol,
  // no "el único hijo" nivel a nivel: un directorio huérfano de un rename anterior haría que
  // el camino no sea único, y este chequeo se saltearía en silencio — que es exactamente lo
  // que un guard no puede hacer. Cero o más de un MainActivity.java es un árbol roto: se
  // corta con error, no se ignora.
  const hallados = [];
  const recorrer = (dir, segmentos) => {
    for (const hijo of readdirSync(dir, { withFileTypes: true })) {
      if (hijo.isDirectory()) recorrer(join(dir, hijo.name), [...segmentos, hijo.name]);
      else if (hijo.name === 'MainActivity.java') hallados.push(segmentos.join('.'));
    }
  };
  recorrer(base, []);

  if (hallados.length !== 1) {
    console.error(
      hallados.length === 0
        ? 'No encontré MainActivity.java abajo de android/app/src/main/java: el proyecto Android quedó roto.'
        : `Hay ${hallados.length} MainActivity.java abajo de android/app/src/main/java (${hallados.join(', ')}): quedó un paquete duplicado de un rename.`,
    );
    console.error('Revisá el árbol a mano antes de confiar en este guard.');
    process.exit(1);
  }
  return hallados;
}

const FUENTES = [
  ['capacitor.config.ts', () => extraer('capacitor.config.ts', /CAP_APP_ID \?\? '([^']+)'/)],
  ['android/app/build.gradle (namespace)', () => extraer('android/app/build.gradle', /namespace\s*=\s*"([^"]+)"/)],
  ['android/app/build.gradle (applicationId)', () => extraer('android/app/build.gradle', /applicationId\s+"([^"]+)"/)],
  ['android · capacitor.config.json', () => extraer('android/app/src/main/assets/capacitor.config.json', /"appId":\s*"([^"]+)"/)],
  ['android · strings.xml', () => extraer('android/app/src/main/res/values/strings.xml', /name="(?:package_name|custom_url_scheme)">([^<]+)</g, true)],
  ['android · paquete de Java (directorio)', paqueteJavaDelDisco],
  ['ios · capacitor.config.json', () => extraer('ios/App/App/capacitor.config.json', /"appId":\s*"([^"]+)"/)],
  ['ios · project.pbxproj', () => extraer('ios/App/App.xcodeproj/project.pbxproj', /PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g, true)],
];

const encontrados = new Map();
for (const [etiqueta, extractor] of FUENTES) {
  const valores = extractor();
  if (valores === null) continue;
  for (const valor of valores) {
    if (!encontrados.has(valor)) encontrados.set(valor, []);
    encontrados.get(valor).push(etiqueta);
  }
}

if (encontrados.size === 0) {
  console.error('No encontré el appId en ningún lado. ¿Se corrió `npx cap add`?');
  process.exit(1);
}

if (encontrados.size > 1) {
  console.error('El appId NO coincide entre archivos:\n');
  for (const [valor, etiquetas] of encontrados) {
    console.error(`  ${valor}`);
    for (const etiqueta of etiquetas) console.error(`      ← ${etiqueta}`);
  }
  console.error('\nArreglalo con: npm run app:id -- <el.id.correcto> && npx cap sync');
  process.exit(1);
}

const [appId] = [...encontrados.keys()];
console.log(`appId consistente en ${[...encontrados.values()][0].length} lugares: ${appId}`);

if (appId.includes('provisional')) {
  console.log('');
  console.log('AVISO: el appId sigue siendo provisional, así que esta app NO se puede publicar.');
  console.log('El package name de Google Play es inmutable post-publicación y el NOMBRE del');
  console.log('producto todavía no se decidió (bloqueador №1 del roadmap).');
  console.log('Cuando se decida: npm run app:id -- com.elnombre.app && npx cap sync');
}
