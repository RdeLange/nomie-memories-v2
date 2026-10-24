// Memories: what was written on this day in earlier years. The scan goes back a year at a time, and stops after a few
// empty years in a row, as v1 did. The result of a day is kept, so opening the plugin again does not search again.
export type Memory = { year: number; notes: Array<{ id?: string; note: string; end?: string }> };

export const FIRST_YEAR = 2014;
export const EMPTY_YEARS_TO_STOP = 3;

// The years to look at for `now`: the same day in each year before this one, from last year back to FIRST_YEAR
export const datesToScan = (now: Date): Date[] => {
  const dates: Date[] = [];
  for (let year = now.getFullYear() - 1; year >= FIRST_YEAR; year--) {
    dates.push(new Date(year, now.getMonth(), now.getDate()));
  }
  return dates;
};

// The key of a day in the cache, as YYYY-MM-DD
export const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Scans the years. `notesOn` gives the notes of a day; only notes with text are kept.
export const scanYears = async (
  dates: Date[],
  notesOn: (date: Date) => Promise<Array<{ id?: string; note?: string; hasNote?: boolean; end?: string }>>,
): Promise<Memory[]> => {
  const found: Memory[] = [];
  let empty = 0;
  for (const date of dates) {
    if (empty >= EMPTY_YEARS_TO_STOP) break;
    const notes = (await notesOn(date)) ?? [];
    if (notes.length === 0) {
      empty += 1;
      continue;
    }
    empty = 0;
    const withText = notes.filter((n) => n.hasNote && n.note).map((n) => ({ id: n.id, note: n.note as string, end: n.end }));
    if (withText.length) found.push({ year: date.getFullYear(), notes: withText });
  }
  return found;
};

// The memory the widget shows: the same one for the whole day, from the years that have one
export const memoryOfDay = (memories: Memory[], now: Date): { memory: Memory; note: Memory['notes'][number] } | undefined => {
  const flat = memories.flatMap((m) => m.notes.map((note) => ({ memory: m, note })));
  if (flat.length === 0) return undefined;
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
  return flat[day % flat.length];
};
