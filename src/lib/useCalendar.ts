import { useState } from 'react';

// Calendario de feriados preferido (para la futura agenda de días hábiles). Por ahora se guarda
// en localStorage como el tema/formato de fecha; cuando se cablee el motor de días hábiles pasa
// a ser una preferencia del usuario en el backend.
export type CalendarPref = 'AR' | 'US';

const STORAGE_KEY = 'holidayCalendar';

function storedPref(): CalendarPref {
  return localStorage.getItem(STORAGE_KEY) === 'US' ? 'US' : 'AR';
}

export function useCalendar() {
  const [calendar, setCalendar] = useState<CalendarPref>(storedPref);

  const set = (next: CalendarPref) => {
    localStorage.setItem(STORAGE_KEY, next);
    setCalendar(next);
  };

  return { calendar, set };
}
