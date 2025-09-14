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

/* === after-hydrate: reapply the current chip filter === */
window.addEventListener('DOMContentLoaded', () => {
  // Give the hydration snippet a moment to set attributes
  setTimeout(() => {
    const btn =
      document.querySelector('#chipRow [aria-pressed="true"]') ||
      document.querySelector('#chipRow .active') ||
      document.querySelector('#chipRow button:first-child');
    if (btn) btn.click();
  }, 400);
});
/* === end after-hydrate === */

/* === after-hydrate: reapply the current chip filter === */
window.addEventListener('DOMContentLoaded', () => {
  // Give the hydration snippet a moment to set attributes
  setTimeout(() => {
    const btn =
      document.querySelector('#chipRow [aria-pressed="true"]') ||
      document.querySelector('#chipRow .active') ||
      document.querySelector('#chipRow button:first-child');
    if (btn) btn.click();
  }, 400);
});
/* === end after-hydrate === */

/* === chips+hydrate: robust attributes + chip builder + filter wiring === */
(function(){
  const normalize = s => (s||'').toLowerCase().replace(/[\s\W_]+/g,'').trim();

  // Attach filtering behavior (idempotent).
  function wireFilters(){
    const row = document.querySelector('#chipRow');
    if (!row) return;
    const cards = Array.from(document.querySelectorAll('.kit-card'));
    const buttons = Array.from(row.querySelectorAll('button'));

    // Make one active
    if (!buttons.some(b => b.getAttribute('aria-pressed') === 'true')) {
      const first = buttons[0];
      if (first) first.setAttribute('aria-pressed','true');
    }

    const apply = (label) => {
      const l = (label||'').toLowerCase();
      cards.forEach(card => {
        const cat  = (card.getAttribute('data-category')||'').toLowerCase();
        const demo = (card.getAttribute('data-demo')||'false') === 'true';
        let show = true;
        if (l === 'all') show = true;
        else if (l === 'on demo') show = demo;
        else show = (cat === l);
        card.style.display = show ? '' : 'none';
      });
    };

    buttons.forEach(btn => {
      if (btn.__wired) return; // idempotent
      btn.__wired = true;
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.setAttribute('aria-pressed','false'));
        btn.setAttribute('aria-pressed','true');
        apply(btn.textContent.trim());
      });
    });

    // Re-apply currently active chip (after hydration)
    setTimeout(() => {
      const active = row.querySelector('[aria-pressed="true"]') || buttons[0];
      if (active) active.click();
    }, 50);
  }

  // Ensure category chips exist based on API.
  function ensureCategoryChips(categories){
    const row = document.querySelector('#chipRow');
    if (!row) return;
    const have = new Set(Array.from(row.querySelectorAll('button')).map(b => b.textContent.trim().toLowerCase()));
    categories.forEach(cat => {
      const lc = (cat||'').toLowerCase();
      if (!lc || have.has(lc) || /^(all|on demo)$/.test(lc)) return;
      const b = document.createElement('button');
      b.className = 'px-3 py-1 rounded-full border';
      b.type = 'button';
      b.textContent = cat; // pretty casing from API
      b.setAttribute('aria-pressed','false');
      row.appendChild(b);
    });
  }

  // Hydrate cards with attributes from /api/kits (name-based matching).
  window.addEventListener('DOMContentLoaded', () => {
    const cards = Array.from(document.querySelectorAll('.kit-card'));
    if (!cards.length) { wireFilters(); return; }

    // Helper to get a “title” from the card using several fallbacks.
    const cardTitle = (card) => {
      const s =
        card.querySelector('.name, h3, h2, [data-name], [data-title]')?.textContent ||
        card.getAttribute('aria-label') ||
        card.querySelector('img')?.getAttribute('alt') ||
        card.textContent; // worst-case
      return (s||'').trim();
    };

    fetch('/api/kits', {cache: 'no-store'})
      .then(r => r.json())
      .then(({kits}) => {
        const list = Array.isArray(kits) ? kits : (kits?.kits || []);
        // Build lookup by normalized name
        const byName = new Map();
        for (const k of list) {
          const key = normalize(k.name);
          if (key) byName.set(key, k);
        }

        // Apply attributes to each card
        const misses = [];
        cards.forEach(card => {
          const t = cardTitle(card);
          const key = normalize(t);
          let k = byName.get(key);

          // small fallback: try startsWith/contains match
          if (!k && key) {
            const found = [...byName.keys()].find(n => n === key || n.startsWith(key) || key.startsWith(n));
            if (found) k = byName.get(found);
          }

          if (k) {
            if (k.category) card.setAttribute('data-category', String(k.category).toLowerCase());
            card.setAttribute('data-demo', String(!!k.on_demo));
          } else {
            misses.push(t);
          }
        });

        // Create any missing chips from API categories
        const cats = [...new Set(list.map(k => (k.category||'').trim()))].filter(Boolean).sort();
        ensureCategoryChips(cats);

        // Wire up filtering and apply current chip
        wireFilters();

        if (misses.length) {
          console.warn('[chips/hydrate] no API match for cards:', misses);
        }
      })
      .catch(e => {
        console.error('[chips/hydrate] failed to load /api/kits:', e);
        wireFilters(); // at least wire “All/On Demo”
      });
  });
})();
 /* === end chips+hydrate === */
