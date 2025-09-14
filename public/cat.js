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
  const norm = s => (s||'').toLowerCase().replace(/\s+/g,' ').trim();

  let READY = false;
  let currentLabel = 'All';

  function ensureChips(categories){
    const row = document.querySelector('#chipRow');
    if (!row) return [];
    // guarantee All + On Demo exist (first two)
    const labels = Array.from(row.querySelectorAll('button')).map(b=>b.textContent.trim());
    function need(lbl){
      if (!labels.map(l=>l.toLowerCase()).includes(lbl.toLowerCase())) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'px-3 py-1 rounded-full border';
        b.textContent = lbl; b.setAttribute('aria-pressed','false');
        row.insertBefore(b, row.firstChild);
        labels.unshift(lbl);
      }
    }
    need('On Demo'); need('All'); // insert “All” last so it ends up first
    // add missing category chips from API
    (categories||[]).forEach(cat=>{
      if (!cat) return;
      const lc = cat.toLowerCase();
      if (['all','on demo'].includes(lc)) return;
      if (!labels.some(l=>l.toLowerCase()===lc)) {
        const b = document.createElement('button');
        b.type='button'; b.className='px-3 py-1 rounded-full border';
        b.textContent = cat; b.setAttribute('aria-pressed','false');
        document.querySelector('#chipRow').appendChild(b);
      }
    });
    return Array.from(row.querySelectorAll('button'));
  }

  function applyFilter(){
    const cards = Array.from(document.querySelectorAll('.kit-card'));
    if (!cards.length) return;
    // Before READY, always show everything (avoid “flash then hide”)
    if (!READY) {
      cards.forEach(c=>c.style.display='');
      return;
    }
    const label = (currentLabel||'All').toLowerCase();
    cards.forEach(card=>{
      const cat  = (card.getAttribute('data-category')||'').toLowerCase();
      const demo = /^(true|1|yes)$/i.test(card.getAttribute('data-demo')||'false');
      let show = true;
      if (label==='all') show = true;
      else if (label==='on demo') show = demo;
      else show = (cat===label);
      card.style.display = show ? '' : 'none';
    });
  }

  function wireClicks(btns){
    btns.forEach(btn=>{
      if (btn.__wired) return;
      btn.__wired = true;
      btn.addEventListener('click', ()=>{
        currentLabel = btn.textContent.trim();
        btns.forEach(b=>b.setAttribute('aria-pressed','false'));
        btn.setAttribute('aria-pressed','true');
        applyFilter();
      });
    });
    // pick a default active if none
    const active = btns.find(b=>b.getAttribute('aria-pressed')==='true') || btns[0];
    if (active) { currentLabel = active.textContent.trim(); active.setAttribute('aria-pressed','true'); }
  }

  function cardTitle(card){
    const s = card.querySelector('.name, h3, h2, [data-name], [data-title]')?.textContent
           || card.getAttribute('aria-label')
           || card.querySelector('img')?.getAttribute('alt')
           || '';
    return s.trim();
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    const cards = Array.from(document.querySelectorAll('.kit-card'));
    const row = document.querySelector('#chipRow');
    if (!row || !cards.length) return;

    // Start by building/wiring chips (safe if repeated) and show all
    wireClicks(ensureChips([]));
    applyFilter();

    // Hydrate attributes from API, then rebuild chips with real categories
    fetch('/api/kits',{cache:'no-store'})
      .then(r=>r.json())
      .then(({kits})=>{
        const list = Array.isArray(kits)?kits:(kits?.kits||[]);
        const byName = new Map(list.map(k=>[norm(k.name),k]));
        const misses = [];

        cards.forEach(card=>{
          const k = byName.get(norm(cardTitle(card)));
          if (k) {
            if (k.category) card.setAttribute('data-category', String(k.category).toLowerCase());
            card.setAttribute('data-demo', String(!!k.on_demo));
          } else {
            misses.push(cardTitle(card));
          }
        });

        const cats = Array.from(new Set(list.map(k=>(k.category||'').trim()))).filter(Boolean).sort();
        const btns = ensureChips(cats);
        wireClicks(btns);

        READY = true;          // now filtering is meaningful
        applyFilter();         // re-apply for the active chip

        if (misses.length) console.warn('[chips] no API match for:', misses);
      })
      .catch(e=>{
        console.error('[chips] hydrate failed', e);
        READY = true;          // even if API fails, allow All/On Demo to work
        applyFilter();
      });
  });
})();
/* === end chips+hydrate === */

