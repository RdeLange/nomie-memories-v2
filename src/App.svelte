<script lang="ts">
  import { onMount } from 'svelte';
  import { memories } from './memories/state.svelte';
  import { memoryOfDay } from './memories/memories';
  import { paletteFrom, type Palette } from './palette';
  import { onPrefsChange } from './prefs-live';

  let view = $state<'modal' | 'widget'>('modal');
  let palette = $state<Palette>(paletteFrom(undefined));
  let scale = $state(1);

  const today = $derived(memoryOfDay(memories.memories, new Date()));

  const applyNomieValues = (plugin: any) => {
    if (!plugin?.prefs) return;
    palette = paletteFrom(plugin.prefs);
    scale = plugin.prefs.fontScale || 1;
  };

  onMount(() => {
    const plugin = new NomiePlugin({
      name: 'Nomie Memories',
      emoji: '📆',
      description: 'What happened on this day in earlier years, from your notes. Shown on the dashboard, or in the More menu.',
      uses: ['searchNotes', 'openNoteEditor', 'getStorageItem', 'setStorageItem'],
      version: '2.0',
      addToCaptureMenu: true,
      addToMoreMenu: true,
      addToWidgets: true,
    });
    onPrefsChange(plugin, () => applyNomieValues(plugin));
    plugin.onRegistered(async () => {
      applyNomieValues(plugin);
      if (!memories.loaded) await memories.load(plugin);
    });
    plugin.onUIOpened(async () => {
      view = 'modal';
      applyNomieValues(plugin);
      if (!memories.loaded) await memories.load(plugin);
    });
    plugin.onWidget(async () => {
      view = 'widget';
      applyNomieValues(plugin);
      if (!memories.loaded) await memories.load(plugin);
    });
  });
</script>

<div class="root" class:widget={view === 'widget'} style="--page: {palette.page}; --card: {palette.card}; --card-inner: {palette.cardInner}; --text: {palette.text}; --muted: {palette.textSecondary}; --line: {palette.separator}; --fill: {palette.fill}; --tint: {palette.tint}; --on-tint: {palette.onTint}; --tint-soft: {palette.tintSoft}; --danger: {palette.danger}; --scale: {scale};">
  {#if view === 'widget'}
    <div class="head"><span aria-hidden="true">📆</span><span class="title">On this day</span></div>
    {#if !memories.loaded || memories.scanning}
      <p class="muted">Looking back…</p>
    {:else if today}
      <button class="memory" onclick={() => memories.reflect(today.memory.year, today.note.note)}>
        <span class="year">{today.memory.year}</span>
        <span class="text">“{today.note.note}”</span>
      </button>
    {:else}
      <p class="muted">No notes from this day in earlier years yet.</p>
    {/if}
  {:else}
    <header class="top">
      <div class="title"><span aria-hidden="true">📆</span><h1>Memories</h1></div>
    </header>
    <p class="muted">What you wrote on this day in earlier years.</p>

    {#if !memories.loaded || memories.scanning}
      <p class="muted">Looking back…</p>
    {:else if memories.memories.length === 0}
      <section class="card"><p class="muted">No notes from this day in earlier years yet.</p></section>
    {:else}
      {#each memories.memories as m (m.year)}
        <h2>{m.year}</h2>
        <section class="card">
          {#each m.notes as n, i (i)}
            <button class="row" onclick={() => memories.reflect(m.year, n.note)}>
              <span class="text">{n.note}</span>
              <span class="reflect">Reflect</span>
            </button>
          {/each}
        </section>
      {/each}
    {/if}

    {#if memories.failed}<p class="problem">The notes could not be read. Try again.</p>{/if}
    <button class="ghost" onclick={() => memories.scan()} disabled={memories.scanning}>Look again</button>
  {/if}
</div>

<style>
  .root { box-sizing: border-box; min-height: 100vh; max-width: 520px; margin: 0 auto; padding: 16px; background: var(--page); color: var(--text); font-size: calc(16px * var(--scale)); line-height: 1.4; }
  /* the widget card is the card colour of the app, and the memory sits directly on it */
  .root.widget { min-height: 0; height: 100vh; max-width: none; padding: 12px; background: var(--card); font-size: calc(15px * var(--scale)); display: flex; flex-direction: column; }
  .top { display: flex; align-items: center; margin-bottom: 4px; }
  .title { display: flex; align-items: center; gap: 8px; font-weight: 600; }
  h1 { margin: 0; font-size: calc(22px * var(--scale)); font-weight: 700; }
  h2 { margin: 16px 0 6px; font-size: calc(13px * var(--scale)); font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .muted { color: var(--muted); font-size: calc(14px * var(--scale)); }
  .card { padding: 4px 16px; border-radius: 16px; background: var(--card); }
  .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; padding: 12px 0; border: 0; border-top: 1px solid var(--line); background: transparent; color: var(--text); font: inherit; text-align: left; cursor: pointer; }
  .row:first-child { border-top: 0; }
  .reflect { color: var(--tint); font-size: calc(13px * var(--scale)); font-weight: 600; flex-shrink: 0; }
  .text { overflow-wrap: anywhere; }
  .head { display: flex; align-items: center; gap: 6px; font-size: calc(13px * var(--scale)); font-weight: 600; color: var(--muted); }
  .memory { display: flex; flex: 1; flex-direction: column; justify-content: center; gap: 6px; padding: 4px 2px; border: 0; background: transparent; color: var(--text); font: inherit; text-align: left; cursor: pointer; }
  .year { font-size: calc(13px * var(--scale)); font-weight: 600; color: var(--muted); }
  .memory .text { font-style: italic; font-size: calc(20px * var(--scale)); line-height: 1.3; }
  .problem { color: var(--danger); font-weight: 600; }
  .ghost { display: block; width: 100%; margin-top: 16px; padding: 12px; border: 0; border-radius: 12px; background: var(--fill); color: var(--text); font: inherit; font-weight: 600; cursor: pointer; }
  .ghost:disabled { opacity: 0.5; }
</style>
