// The state of the plugin: the memories of the day, kept in storage so the widget and the plugin share them.
import { dayKey, datesToScan, scanYears, type Memory } from './memories';

class MemoriesState {
  plugin: any = null;
  loaded = $state(false);
  day = $state('');
  memories = $state<Memory[]>([]);
  scanning = $state(false);
  failed = $state(false);

  async load(plugin: any): Promise<void> {
    this.plugin = plugin;
    await plugin.storage.init();
    const cache = plugin.storage.getItem('cache');
    const today = dayKey(new Date());
    this.loaded = true;
    if (cache?.day === today) {
      this.day = cache.day;
      this.memories = cache.memories;
      return;
    }
    await this.scan();
  }

  // Looks back over the years for this day, and keeps the result for the rest of the day
  async scan(): Promise<void> {
    if (!this.plugin || this.scanning) return;
    this.scanning = true;
    this.failed = false;
    try {
      const now = new Date();
      const found = await scanYears(datesToScan(now), async (date) => (await this.plugin.searchNotes('', date, 0)) ?? []);
      this.memories = found;
      this.day = dayKey(now);
      this.plugin.storage.setItem('cache', { day: this.day, memories: $state.snapshot(found) });
    } catch {
      this.failed = true;
    } finally {
      this.scanning = false;
    }
  }

  // A reflection on a memory opens in the note editor, with the old note quoted
  reflect(year: number, note: string): void {
    this.plugin.openNoteEditor(`Reflecting on ${year}:\n${note}\n`);
  }
}

export const memories = new MemoriesState();
