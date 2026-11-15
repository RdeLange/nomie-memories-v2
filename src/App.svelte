<script lang="ts">
  import { startSnapshots } from './snapshot';
  import { onMount } from 'svelte';
  import { memories } from './memories/state.svelte';
  import { memoryOfDay } from './memories/memories';
  import { paletteFrom, glassFrom, tintTextFrom, dangerTextFrom, type Palette, type Glass } from './palette';
  import { t, setLanguage } from './i18n/index.svelte';
  import { onPrefsChange } from './prefs-live';

  let view = $state<'modal' | 'widget'>('modal');
  let palette = $state<Palette>(paletteFrom(undefined));
  let glass = $state<Glass>(glassFrom(undefined));
  let tintText = $state(tintTextFrom(undefined));
  let dangerText = $state(dangerTextFrom(undefined));
  let scale = $state(1);

  const today = $derived(memoryOfDay(memories.memories, new Date()));

  const applyNomieValues = (plugin: any) => {
    if (!plugin?.prefs) return;
    palette = paletteFrom(plugin.prefs);
    setLanguage(plugin.prefs?.language);
    glass = glassFrom(plugin.prefs);
    tintText = tintTextFrom(plugin.prefs);
    dangerText = dangerTextFrom(plugin.prefs);
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
    startSnapshots(plugin);
    onPrefsChange(plugin, () => applyNomieValues(plugin));
    // Nomie's widget settings read the widgets this plugin offers from 'widgets' (id, name and emoji).
    // This plugin offers one widget, so the list has one entry.
    plugin.onRegistered(async () => {
      await plugin.storage.init();
      await plugin.storage.setItem('widgets', [{ widgetid: 'main', name: 'Memories', emoji: '📆' }]);
    });
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

<div class="root" class:widget={view === 'widget'} style="--page: {palette.page}; --card: {palette.card}; --card-inner: {palette.cardInner}; --text: {palette.text}; --muted: {palette.textSecondary}; --line: {palette.separator}; --fill: {palette.fill}; --tint: {palette.tint}; --on-tint: {palette.onTint}; --tint-soft: {palette.tintSoft}; --danger: {dangerText}; --tint-text: {tintText}; --glass-fill: {glass.fill}; --glass-edge: {glass.edge}; --glass-blur: {glass.blur}; --glass-shadow: {glass.shadow}; --scale: {scale};">
  {#if view === 'widget'}
    <div class="head"><span aria-hidden="true">📆</span><span class="title">{t('widgetTitle')}</span></div>
    {#if !memories.loaded || memories.scanning}
      <p class="muted">{t('lookingBack')}</p>
    {:else if today}
      <button class="memory" onclick={() => memories.reflect(today.memory.year, today.note.note)}>
        <span class="year">{today.memory.year}</span>
        <span class="text">“{today.note.note}”</span>
      </button>
    {:else}
      <p class="muted">{t('noNotesYet')}</p>
    {/if}
  {:else}
    <header class="top">
      <div class="title"><span aria-hidden="true">📆</span><h1>Memories</h1></div>
    </header>
    <p class="muted">{t('intro')}</p>

    {#if !memories.loaded || memories.scanning}
      <p class="muted">{t('lookingBack')}</p>
    {:else if memories.memories.length === 0}
      <section class="card"><p class="muted">{t('noNotesYet')}</p></section>
    {:else}
      {#each memories.memories as m (m.year)}
        <h2>{m.year}</h2>
        <section class="card">
          {#each m.notes as n, i (i)}
            <button class="row" onclick={() => memories.reflect(m.year, n.note)}>
              <span class="text">{n.note}</span>
              <span class="reflect">{t('reflect')}</span>
            </button>
          {/each}
        </section>
      {/each}
    {/if}

    {#if memories.failed}<p class="problem">{t('failed')}</p>{/if}
    <button class="ghost" onclick={() => memories.scan()} disabled={memories.scanning}>{t('lookAgain')}</button>
  {/if}
</div>

<style>
  .root { box-sizing: border-box; min-height: 100vh; max-width: 520px; margin: 0 auto; padding: 16px; background: var(--page); color: var(--text); font-size: calc(16px * var(--scale)); line-height: 1.4; }
  /* the widget card is the card colour of the app, and the memory sits directly on it */
  .root.widget { min-height: 0; height: 100vh; max-width: none; padding: 12px; background: var(--card); font-size: calc(15px * var(--scale)); display: flex; flex-direction: column; }
  /* the plugin page fills the frame, so the glass bar sits at the top edge */
  :global(body) { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif; -webkit-font-smoothing: antialiased; --ios-font-rounded: ui-rounded, -apple-system, system-ui, sans-serif; }
  /* the header is a Liquid Glass bar (D-glass): it stays at the top and the content scrolls under it */
  .top { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; margin: -16px -16px 8px; padding: 16px 16px 10px; background: var(--glass-fill); -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur); border-bottom: 1px solid var(--glass-edge); }
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
