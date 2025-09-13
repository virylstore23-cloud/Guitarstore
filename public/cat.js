/** Category chips from /api/kits; renders beside "All / On Demo" and filters #kitGrid by [data-category] */
(function () {
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
  ready(async () => {
    try {
      const res = await fetch('/api/kits', { cache: 'no-store' });
      const data = await res.json();
      const kits = Array.isArray(data?.kits) ? data.kits : [];
      if (!kits.length) return;

      // Use the SAME row as the existing chips
      const row = document.querySelector('.flex.flex-wrap.gap-2');
      if (!row) return;

      // Copy look from existing chip
      const sample = row.querySelector('button.chip') || document.querySelector('button');
      const base = sample ? sample.className : 'chip px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-200';

      // Build unique categories (string .category)
      const cats = Array.from(new Set(kits
        .map(k => (k.category || '').trim())
        .filter(Boolean)
      )).sort((a,b)=>a.localeCompare(b));
      if (!cats.length) return;

      function setActive(el,on){
        el.classList.toggle('bg-blue-600', on);
        el.classList.toggle('text-white', on);
        el.classList.toggle('ring-1', on);
        el.classList.toggle('ring-blue-400', on);
      }

      const buttons = [];
      cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = base;
        btn.textContent = cat;
        btn.dataset.cat = cat;
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => {
          buttons.forEach(b => setActive(b, b === btn));
          const want = cat.toLowerCase();
          // Query cards fresh each time (in case grid rendered later)
          document.querySelectorAll('#kitGrid [data-category]').forEach(card => {
            const has = (card.getAttribute('data-category') || '').toLowerCase();
            card.style.display = (has === want) ? '' : 'none';
          });
        });
        row.appendChild(btn);   // put them in the SAME row
        buttons.push(btn);
      });

      // Make "All" clear the filter
      const allBtn = Array.from(row.querySelectorAll('button'))
        .find(b => /^\s*all\s*$/i.test(b.textContent || ''));
      if (allBtn) {
        allBtn.addEventListener('click', () => {
          buttons.forEach(b => setActive(b, false));
          document.querySelectorAll('#kitGrid [data-category]').forEach(card => { card.style.display = ''; });
        });
      }
    } catch (_) { /* never break the page */ }
  });
})();
