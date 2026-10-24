import { describe, expect, it } from 'vitest';
import { FIRST_YEAR, dayKey, datesToScan, memoryOfDay, scanYears } from '../memories/memories';

describe('the years to look at', () => {
  it('the same day in each year, from last year back to 2014', () => {
    const dates = datesToScan(new Date(2026, 9, 25, 9));
    expect(dates[0].getFullYear()).toBe(2025);
    expect(dates[dates.length - 1].getFullYear()).toBe(FIRST_YEAR);
    expect(dates[0].getMonth()).toBe(9);
    expect(dates[0].getDate()).toBe(25);
  });

  it('a day is kept as YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('the scan', () => {
  const dates = [2025, 2024, 2023, 2022, 2021, 2020].map((y) => new Date(y, 9, 25));
  const notesOf: Record<number, Array<{ id?: string; note?: string; hasNote?: boolean }>> = {
    2025: [],
    2024: [{ id: 'a', note: 'Walked by the sea', hasNote: true }, { id: 'b', hasNote: false }],
    2023: [{ id: 'c', hasNote: false }],
    2022: [],
    2021: [{ id: 'd', note: 'Should not be reached', hasNote: true }],
    2020: [],
  };

  it('keeps the notes with text; a year with notes resets the count of empty years', async () => {
    const found = await scanYears(dates, async (d) => notesOf[d.getFullYear()] ?? []);
    expect(found.map((m) => m.year)).toEqual([2024, 2021]);
    expect(found[0].notes).toEqual([{ id: 'a', note: 'Walked by the sea', end: undefined }]);
  });

  it('stops after three empty years in a row, without looking further back', async () => {
    const looked: number[] = [];
    const found = await scanYears(dates, async (d) => {
      looked.push(d.getFullYear());
      return d.getFullYear() === 2020 ? [{ id: 'z', note: 'Too far back', hasNote: true }] : [];
    });
    expect(found).toEqual([]);
    expect(looked).toEqual([2025, 2024, 2023]);
  });

  it('a year with notes but no text is not a memory, and does not count as empty', async () => {
    const calls: number[] = [];
    await scanYears(dates, async (d) => {
      calls.push(d.getFullYear());
      return notesOf[d.getFullYear()] ?? [];
    });
    expect(calls).toContain(2021);
  });
});

describe('the memory of the day', () => {
  it('is the same for the whole day, and none without memories', () => {
    const memories = [{ year: 2024, notes: [{ note: 'one' }, { note: 'two' }] }];
    const morning = memoryOfDay(memories, new Date(2026, 9, 25, 8));
    const evening = memoryOfDay(memories, new Date(2026, 9, 25, 22));
    expect(morning).toEqual(evening);
    expect(memoryOfDay([], new Date())).toBeUndefined();
  });
});
