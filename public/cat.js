/** cat.js — builds category chips from /api/kits and filters #kitGrid cards
 *  Requirements:
 *    - #chipRow exists
 *    - each card has: data-category="drum kits|accessories|..." (lowercase)
 *    - optional: data-demo="true|false"
 */
(() => {
  const ready = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
    else fn();
  };

  ready(async () => {
    const row = document.querySelector('#chipRow');
    if (!row) return;

    // 1) Read ground-truth categories from API
    let cats = [];
    try {
      const r = await fetch('/api/kits', { cache: 'no-store', credentials: 'omit' });
      const j = await r.json();
      cats = [...new Set((j.kits || [])
        .map(k => (k.category || '').toLowerCase().trim())
        .filter(Boolean))].sort();
    } catch (_e) {
      // never break the page
    }

    // 2) Build the chips inline with existing "All" / "On Demo"
    const makeBtn = (label, { dataset = {}, title = '' } = {}) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = label;
      if (title) b.title = title;
      Object.assign(b.dataset, dataset);
      return b;
    };

    // If row currently only has All/On Demo, keep them and append cats
    const existing = [...row.querySelectorAll('button')];
    const labelOf = (b) => (b.textContent || '').trim().toLowerCase();
    const hasAll   = existing.some(b => labelOf(b) === 'all');
    const hasDemo  = existing.some(b => labelOf(b) === 'on demo');

    // Ensure baseline chips exist
    if (!hasAll)  row.appendChild(makeBtn('All',    { dataset: { filter: 'all'  }}));
    if (!hasDemo) row.appendChild(makeBtn('On Demo',{ dataset: { filter: 'demo' }}));

    // Remove any old category chips and rebuild
    [...row.querySelectorAll('button[data-filter="cat"]')].forEach(b => b.remove());
    cats.forEach(cat => {
      const btn = makeBtn(cat.replace(/\b\w/g, m=>m.toUpperCase()), {
        dataset: { filter: 'cat', cat }
      });
      row.appendChild(btn);
    });

    const setActive = (btn, on=true) => {
      btn.classList.toggle('ring-1', on);
      btn.classList.toggle('ring-teal-400/60', on);
      btn.classList.toggle('bg-zinc-800/60', on);
    };

    const clearAll = () => {
      row.querySelectorAll('button').forEach(b => setActive(b, false));
      document.querySelectorAll('#kitGrid .kit-card').forEach(c => c.style.display = '');
    };

    // 3) Wire All
    const allBtn = [...row.querySelectorAll('button')].find(b => labelOf(b) === 'all');
    if (allBtn) {
      allBtn.addEventListener('click', () => {
        clearAll();
        setActive(allBtn, true);
      });
    }

    // 4) Wire On Demo
    const demoBtn = [...row.querySelectorAll('button')].find(b => labelOf(b) === 'on demo');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        row.querySelectorAll('button').forEach(b => setActive(b, false));
        setActive(demoBtn, true);
        document.querySelectorAll('#kitGrid .kit-card').forEach(card => {
          const isDemo = (card.getAttribute('data-demo') || '').toLowerCase() === 'true';
          card.style.display = isDemo ? '' : 'none';
        });
      });
    }

    // 5) Wire category chips
    row.querySelectorAll('button[data-filter="cat"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const want = (btn.dataset.cat || '').toLowerCase();
        row.querySelectorAll('button').forEach(b => setActive(b, false));
        setActive(btn, true);

        document.querySelectorAll('#kitGrid .kit-card').forEach(card => {
          const has = (card.getAttribute('data-category') || '').toLowerCase();
          card.style.display = (has === want) ? '' : 'none';
        });
      });
    });

    // 6) Default: mark All active
    if (allBtn) setActive(allBtn, true);
  });
})();

/* === hydrate data-category/data-demo on cards from API (safe, idempotent) === */
window.addEventListener('DOMContentLoaded', () => {
  fetch('/api/kits', { cache: 'no-store' })
    .then(r => r.json())
    .then(d => {
      const map = new Map(
        (d.kits || []).map(k => [
          (k.name || '').trim().toLowerCase(),
          { cat: (k.category || '').toLowerCase(), demo: !!k.on_demo }
        ])
      );

      document.querySelectorAll('.kit-card').forEach(card => {
        const title = (card.querySelector('.name, h3, [data-name]')?.textContent || '').trim().toLowerCase();
        const m = map.get(title);
        if (m) {
          card.setAttribute('data-category', m.cat);
          card.setAttribute('data-demo', String(m.demo));
        }
      });
    })
    .catch(err => console.error('[hydrate-attrs] failed:', err));
});
/* === end hydrate === */
