/* Alesis grouped catalog: Drum Kits / Drum Amps / Accessories */
(function(){
  function guessCategory(k){
    const n = String(k.name||'').toLowerCase();
    const d = String(k.description||'').toLowerCase();
    const blob = [n,d,...(k.features||[]),...(k.contents||[])].join(' ').toLowerCase();
    if (/(amp|monitor|speaker)\b/.test(n) || /(drum monitor|amp|monitor)/.test(d) || /(watt|woofer|tweeter)/.test(blob)) return 'Drum Amps';
    if (/\bkit\b/.test(n) || /(mesh|strata|crimson|nitro|surge|turbo|cymbal|snare|tom|rack|hi-hat|ride|crash)/.test(blob)) return 'Drum Kits';
    return 'Accessories';
  }

  function groupify(list){
    const buckets = new Map([['Drum Kits',[]],['Drum Amps',[]],['Accessories',[]]]);
    (list||[]).forEach(k=>{
      const cat = (k.category || '').trim() || guessCategory(k);
      if (!buckets.has(cat)) buckets.set(cat, []);
      buckets.get(cat).push(k);
    });
    return [...buckets.entries()].filter(([,arr])=>arr.length>0);
  }

  function cardHTML(k, selected){
    const sel = selected && selected.has && selected.has(k.id);
    return `
      <div class="bg-zinc-900/40 rounded-xl overflow-hidden shadow border border-zinc-800 hover:border-zinc-700 transition">
        <div class="aspect-[4/3] bg-black/30 flex items-center justify-center overflow-hidden">
          <img src="${k.primary_image_url || k.detail_image_url || (k.images&&k.images[0]) || ''}" alt="${k.name}" class="object-cover w-full h-full">
        </div>
        <div class="p-3 sm:p-4 space-y-1">
          <div class="text-sm sm:text-base font-extrabold tracking-tight">${k.name}</div>
          ${k.price ? `<div class="text-xs sm:text-sm text-zinc-400">AED ${k.price}</div>` : ''}
          ${k.on_demo ? `<div class="inline-block text-[10px] px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-300">${k.on_demo_label || 'On Demo'}</div>` : ''}
          <div class="flex items-center gap-3 pt-2">
            <label class="text-xs text-zinc-300">
              <input type="checkbox" data-sel="${k.id}" ${sel?'checked':''}/> Select
            </label>
            <button class="btn" data-action="open" data-id="${k.id}">Explore</button>
          </div>
        </div>
      </div>`;
  }

  function sectionHTML(title, items, selected){
    const cards = items.map(k=>`<div>${cardHTML(k, selected)}</div>`).join('');
    return `
      <section class="mb-10">
        <h2 class="text-xl sm:text-2xl font-bold tracking-tight mb-3">${title}</h2>
        <div class="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          ${cards}
        </div>
      </section>`;
  }

  async function ensureKits(){
    // If the app already set them, use those.
    if (Array.isArray(window.kits) && window.kits.length) return window.kits;

    // Try to fetch directly from the API as a fallback.
    try {
      const res = await fetch('/api/kits?t=' + Date.now(), {cache:'no-store'});
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const {kits} = await res.json();
      if (Array.isArray(kits) && kits.length) {
        window.kits = kits;      // cache for the app
        return kits;
      }
    } catch (e) {
      console.warn('[Alesis] fallback fetch failed:', e);
    }

    return [];
  }

  async function renderGrouped(){
    const root = document.getElementById('root') || document.body;
    if (!root) return console.warn('[Alesis] no root to render into');

    const kits = (Array.isArray(window.kits) && window.kits.length)
      ? window.kits
      : await ensureKits();

    if (!kits.length) return console.warn('[Alesis] kits still not ready');

    const selected = window.selected || new Set();
    const groups = groupify(kits);

    const wrap = document.createElement('div');
    wrap.id = 'grouped-root';
    wrap.className = 'container mx-auto px-3 sm:px-6 pb-16';
    wrap.innerHTML = groups.map(([title, items]) => sectionHTML(title, items, selected)).join('');

    const existing = document.getElementById('grouped-root');
    if (existing) existing.replaceWith(wrap);
    else {
      // If the app already had a main grid, replace it. Otherwise append.
      const grid = document.getElementById('grid');
      if (grid && grid.parentElement) grid.parentElement.replaceWith(wrap);
      else root.appendChild(wrap);
    }

    const btn = document.getElementById('btn-compare');
    if (btn) btn.disabled = selected.size < 2;

    console.log('[Alesis] Grouped view rendered');
  }

  window.renderGrouped = renderGrouped;

  // Try periodically; also react to a custom event if the app dispatches one.
  (function waitLoop(i=0){
    if ((Array.isArray(window.kits) && window.kits.length) || i >= 15) {
      renderGrouped();
      return;
    }
    setTimeout(()=>waitLoop(i+1), 200);
  })();

  window.addEventListener('kits:ready', () => renderGrouped());
})();
