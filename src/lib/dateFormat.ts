import { useState } from 'react';

// Preferencia de formato de fecha para los textos de la app (no el picker nativo, que sigue
// el locale del SO): 'ar' = DD/MM/AAAA (normal), 'us' = MM/DD/AAAA (yankee). Argentina no usa
// MM/DD, de ahí la opción. Se guarda en localStorage (como el tema); cada pantalla lee el
// valor al montar, así navegar entre Ajustes y el resto lo toma.
export type DateFormatPref = 'ar' | 'us';

const STORAGE_KEY = 'dateFormat';

function storedPref(): DateFormatPref {
  return localStorage.getItem(STORAGE_KEY) === 'us' ? 'us' : 'ar';
}

// iso = 'YYYY-MM-DD' → 'DD/MM/AAAA' o 'MM/DD/AAAA' según la preferencia.
export function formatDate(iso: string, pref: DateFormatPref): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return pref === 'us' ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}

export function useDateFormat() {
  const [pref, setPref] = useState<DateFormatPref>(storedPref);

  const set = (next: DateFormatPref) => {
    localStorage.setItem(STORAGE_KEY, next);
    setPref(next);
  };

  return { pref, set };
}
