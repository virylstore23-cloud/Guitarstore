/** Category chips beside "All / On Demo"; filters by category with UPC mapping. */
(function () {
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}

  ready(async () => {
    try {
      const r = await fetch('/api/kits', {cache:'no-store'});
      const j = await r.json();
      const kits = Array.isArray(j?.kits) ? j.kits : [];
      if (!kits.length) return;

      // Map UPC -> category (lowercased)
      const catByUpc = new Map();
      kits.forEach(k => {
        const upc = String(k.upc_code || k.upc || '').replace(/\D/g,''); // digits only
        const cat = String(k.category || '').trim().toLowerCase();
        if (upc && cat) catByUpc.set(upc, cat);
      });

      // Put our chips into the same row as the existing ones
      const row = document.querySelector('.flex.flex-wrap.gap-2');
      if (!row) return;
      const sample = row.querySelector('button.chip') || document.querySelector('button');
      const baseClass = sample ? sample.className : 'chip px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-200';

      // Build unique categories (from API)
      const categories = Array.from(new Set(kits.map(k => String(k.category||'').trim()).filter(Boolean)))
        .sort((a,b)=>a.localeCompare(b));
      if (!categories.length) return;

      function setActive(el,on){
        el.classList.toggle('bg-blue-600', on);
        el.classList.toggle('text-white', on);
        el.classList.toggle('ring-1', on);
        el.classList.toggle('ring-blue-400', on);
      }

      // Helper: ensure each card is tagged with data-upc and data-category if we can infer it
      function ensureCardTags(card){
        // data-upc
        let upc = card.getAttribute('data-upc');
        if (!upc) {
          // try to parse from text content "UPC: 0694..."
          const m = (card.textContent || '').match(/UPC:\s*([0-9]+)/i);
          if (m) upc = m[1];
          if (upc) card.setAttribute('data-upc', upc);
        }
        // data-category
        let cat = (card.getAttribute('data-category') || '').toLowerCase();
        if (!cat && upc) {
          const lookup = catByUpc.get(String(upc).replace(/\D/g,''));
          if (lookup) {
            cat = lookup;
            card.setAttribute('data-category', cat);
          }
        }
        return { upc, cat };
      }

      const buttons = [];
      categories.forEach(catLabel => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = baseClass;
        btn.textContent = catLabel;
        btn.dataset.cat = catLabel;
        btn.style.cursor = 'pointer';

        btn.addEventListener('click', () => {
          buttons.forEach(b => setActive(b, b === btn));
          const want = catLabel.toLowerCase();
          // Query fresh each time (works even if grid rendered after our script)
          document.querySelectorAll('#kitGrid > *').forEach(card => {
            const { cat } = ensureCardTags(card);
            card.style.display = (cat === want) ? '' : 'none';
          });
        });

        row.appendChild(btn);
        buttons.push(btn);
      });

      // Make "All" clear the filter
      const allBtn = Array.from(row.querySelectorAll('button'))
        .find(b => /^\s*all\s*$/i.test(b.textContent || ''));
      if (allBtn) {
        allBtn.addEventListener('click', () => {
          buttons.forEach(b => setActive(b,false));
          document.querySelectorAll('#kitGrid > *').forEach(card => { ensureCardTags(card); card.style.display = ''; });
        });
      }
    } catch (_) { /* never break the page */ }
  });
})();
