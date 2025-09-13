/** Category chips from /api/kits (using string .category on each item) */
(function () {
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}

  ready(async () => {
    try {
      const r = await fetch('/api/kits', { cache:'no-store' });
      const { kits } = await r.json();
      if (!Array.isArray(kits) || !kits.length) return;

      // 1) Find the existing chip row (All / On Demo) to copy styles from
      const hostRow = document.querySelector('.flex.flex-wrap.gap-2') || document.querySelector('main');
      const sampleChip = document.querySelector('button.chip') || document.querySelector('button');

      const baseClass = sampleChip ? sampleChip.className :
        'chip px-3 py-1.5 rounded-lg border border-zinc-500/40 text-zinc-200';

      // 2) Build unique category list
      const cats = Array.from(new Set(
        kits.map(k => (k.category || '').trim()).filter(Boolean)
      )).sort((a,b)=>a.localeCompare(b));

      if (!cats.length || !hostRow) return;

      // 3) Insert our row just after the existing chips; lift above overlays
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.flexWrap = 'wrap';
      row.style.gap = '0.5rem';
      row.style.marginTop = '0.75rem';
      row.style.position = 'relative';
      row.style.zIndex = '50';          // <-- ensures it’s clickable
      hostRow.parentElement.insertBefore(row, hostRow.nextSibling);

      // 4) Map cards by their data-category
      const cards = Array.from(document.querySelectorAll('[data-category]'));

      // visual active toggle
      function setActive(el, on){
        el.classList.toggle('bg-blue-600', on);
        el.classList.toggle('text-white', on);
        el.style.boxShadow = on ? '0 0 0 2px rgba(59,130,246,.6) inset' : '';
      }

      const buttons = [];
      cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = baseClass;
        btn.textContent = cat;
        btn.setAttribute('data-cat', cat);
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => {
          buttons.forEach(b => setActive(b, b===btn));
          const want = cat.toLowerCase();
          cards.forEach(card => {
            const has = (card.getAttribute('data-category') || '').toLowerCase();
            card.style.display = (has === want) ? '' : 'none';
          });
        });
        row.appendChild(btn);
        buttons.push(btn);
      });

      // 5) Make the existing "All" chip clear our filter (if present)
      const allChip = Array.from(document.querySelectorAll('button.chip,button'))
        .find(b => /all/i.test(b.textContent || ''));
      if (allChip){
        allChip.addEventListener('click', () => {
          buttons.forEach(b => setActive(b,false));
          cards.forEach(card => { card.style.display = ''; });
        });
      }
    } catch(_e){ /* never break the page */ }
  });
})();
