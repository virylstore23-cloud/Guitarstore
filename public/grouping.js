/* public/grouping.js — group catalog into Drum Kits / Drum Amps / Accessories */
(function () {
  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#111111"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#dddddd" font-family="Arial" font-size="20">Image coming soon</text></svg>');

  function classifyCategory(k) {
    const n = String(k.name || '').toLowerCase();
    const d = String(k.description || '').toLowerCase();
    if (/(amp|monitor|speaker)\b/.test(n) || /(drum monitor|amp|monitor)/.test(d)) return 'Drum Amps';
    if (/\bkit\b/.test(n) || /(mesh|strata|crimson|nitro|surge|turbo)/.test(n)) return 'Drum Kits';

    const blob = [n, d, ...(k.features||[]), ...(k.contents||[])].join(' ').toLowerCase();
    if (/(amp|monitor|watt|woofer|tweeter)/.test(blob)) return 'Drum Amps';
    if (/(kit|mesh|cymbal|snare|tom|rack|hi-hat|ride|crash)/.test(blob)) return 'Drum Kits';
    return 'Accessories';
  }

  const GROUP_ORDER = ['Drum Kits', 'Drum Amps', 'Accessories'];
  function sortKitsWithinGroup(a, b) {
    const pa = a.price ?? Infinity, pb = b.price ?? Infinity;
    if (pa !== pb) return pa - pb;
    return String(a.name).localeCompare(String(b.name));
  }

  // fallback helpers if not defined by app.js yet
  const money = (window.money) || (n => (n==null?'—':'AED '+Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})));
  const selected = (window.selected) || new Set();

  function renderGrouped(allKits = (window.kits||[])) {
    const root = document.getElementById('grid');
    if (!root) return;
    root.innerHTML = '';

    // buckets
    const map = new Map();
    allKits.filter(k=>k.is_active).forEach(k=>{
      const g = classifyCategory(k);
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(k);
    });

    const names = [
      ...GROUP_ORDER.filter(g => map.has(g)),
      ...[...map.keys()].filter(g => !GROUP_ORDER.includes(g))
    ];

    names.forEach(group => {
      const items = (map.get(group)||[]).sort(sortKitsWithinGroup);
      if (!items.length) return;

      const section = document.createElement('section');
      section.className = 'mb-10';
      section.innerHTML = `
        <h2 class="text-xl sm:text-2xl font-bold mb-3 tracking-tight">${group}</h2>
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"></div>
      `;
      const grid = section.querySelector('.grid');

      items.forEach(k=>{
        const el = document.createElement('article');
        el.className = 'card p-4';
        el.setAttribute('data-id', k.id);
        el.innerHTML = `
          <figure class="img-frame img-16x10 mb-3">
            <img src="${k.image}" alt="${k.name}" class="img-fill" loading="lazy"
                 onerror="this.onerror=null;this.src='${PLACEHOLDER}'" />
          </figure>
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-extrabold">${k.name}</h3>
              <p class="text-zinc-300 text-sm line-clamp-2">${k.description||''}</p>
              <div class="text-sm text-zinc-200 mt-1">Price: ${money(k.price)}</div>
              <div class="text-xs text-zinc-400">UPC: ${k.upc || k.upc_code || '—'}</div>
              ${k.on_demo ? `<div class="mt-1 inline-block text-xs bg-white/10 px-2 py-1 rounded">${k.on_demo_label || 'On demo'}</div>` : ''}
            </div>
            <div class="shrink-0 flex flex-col items-end gap-2">
              <label class="text-xs text-zinc-300">
                <input type="checkbox" data-sel="${k.id}" ${selected.has(k.id)?'checked':''} /> Select
              </label>
              <button class="btn" data-action="open" data-id="${k.id}">Explore</button>
            </div>
          </div>
        `;
        grid.appendChild(el);
      });

      root.appendChild(section);
    });

    const btn = document.getElementById('btn-compare');
    if (btn) btn.disabled = selected.size < 2;
  }

  // Override the app’s renderer with the grouped one
  window.render = renderGrouped;
})();
