// S44 — Guardar/compartir un archivo desde la app nativa.
//
// En la web, bajar un archivo es un `<a download>` invisible y listo (S26). Adentro del
// WebView eso no hace nada útil: no hay carpeta de Descargas del browser ni gestor de
// descargas, así que el click se pierde y el usuario ve que "no pasó nada" después de
// esperar la generación del .xlsx.
//
// El equivalente nativo es escribir el archivo en el cache de la app y abrir la hoja de
// compartir del sistema, que es donde el usuario elige: guardar en Archivos/Drive, mandarlo
// por WhatsApp, mail, lo que sea. Es además lo que la gente espera en un teléfono.
//
// Los imports de plugins son dinámicos y viven adentro de la función — TODOS, incluido el
// enum `Directory`: un import estático acá anularía el dinámico (Vite lo marca como
// INEFFECTIVE_DYNAMIC_IMPORT) y metería el plugin en el chunk equivocado.

/** Blob → base64 pelado (sin el prefijo `data:...;base64,`), que es lo que espera Filesystem. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('No se pudo leer el archivo.'));
        return;
      }
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Cancelar la hoja de compartir NO es un error.
 *
 * En iOS y Android el plugin rechaza con "Share canceled" cuando el usuario toca afuera. Si
 * eso subiera como error, `useExport` mostraría un toast rojo de "no se pudo exportar" por
 * haber cambiado de opinión, que es mentira y además asusta en una app de plata.
 *
 * Anclado al principio del mensaje a propósito: un `/cancel/` suelto se tragaría cualquier
 * error real que mencione la palabra, y ese sí tiene que llegar al toast.
 */
function isShareCanceled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /^share cancell?ed/i.test(message.trim());
}

export async function shareFileNatively(blob: Blob, filename: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);

  // Va al cache y no a Documents a propósito: es un archivo de paso, y una vez que el usuario
  // eligió dónde guardarlo la copia nuestra no le sirve a nadie. El cache lo limpia el sistema
  // operativo cuando necesita espacio, sin que tengamos que barrer nada a mano.
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  });

  try {
    await Share.share({ title: filename, files: [uri] });
  } catch (error) {
    if (!isShareCanceled(error)) throw error;
  }
}
