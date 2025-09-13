/** Category chips from /api/kits (string .category); copy look of existing chips; never break page */
(function () {
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }

  ready(async function init(){
    try{
      const res = await fetch('/api/kits', { credentials:'omit' });
      const payload = await res.json();
      const kits = Array.isArray(payload?.kits) ? payload.kits : [];

      // Build unique categories from string field
      const categories = Array.from(new Set(
        kits.map(k => (k.category || '').trim()).filter(Boolean)
      )).sort((a,b)=>a.localeCompare(b));

      if(!categories.length) return; // nothing to show

      // Find existing chips to clone classes (“All”, “On Demo”)
      const existing = Array.from(document.querySelectorAll('button, a'))
        .filter(el => /all|on demo/i.test(el.textContent.trim()));
      const styleSource = existing[0] || document.querySelector('button');

      const fallback = 'px-3 py-1.5 rounded-full border border-blue-400 text-blue-200 bg-transparent shadow-sm inline-flex items-center gap-2 text-sm font-semibold';
      const baseClasses = styleSource ? styleSource.className : fallback;

      // Insert our chip row right after the existing row
      const chipRow = styleSource ? styleSource.parentElement : document.querySelector('main');
      if(!chipRow || !chipRow.parentElement) return;

      const row = document.createElement('div');
      row.style.display='flex'; row.style.flexWrap='wrap'; row.style.gap='0.5rem'; row.style.marginTop='0.5rem';
      chipRow.parentElement.insertBefore(row, chipRow.nextSibling);

      // Build fast map: kit.name -> category
      const catByName = new Map(kits.map(k => [String(k.name).trim().toLowerCase(), k.category]));

      // Build map of cards by their data attributes (added in step #2)
      const cards = Array.from(document.querySelectorAll('[data-kit-name]'));
      const byName = new Map(cards.map(el => [String(el.getAttribute('data-kit-name')).trim().toLowerCase(), el]));

      // Helper to toggle active classes like existing chips
      const ACTIVE = ['active','selected','bg-blue-600','text-white'];
      function setActive(btn,on){
        ACTIVE.forEach(c=>btn.classList.toggle(c,on));
        if(existing[1]) {
          existing[1].className.split(' ')
            .filter(c => /active|selected|bg-|text-white/.test(c))
            .forEach(c => btn.classList.toggle(c,on));
        }
      }

      const buttons = [];
      categories.forEach(cat=>{
        const btn = document.createElement('button');
        btn.type='button';
        btn.className = baseClasses;
        btn.textContent = cat;
        btn.setAttribute('data-cat',cat);
        btn.addEventListener('click', ()=>{
          buttons.forEach(b=>setActive(b, b===btn));
          // Show cards whose kit belongs to this category
          byName.forEach((el, name)=>{
            const kitsCat = catByName.get(name);
            el.style.display = (kitsCat === cat) ? '' : 'none';
          });
        });
        row.appendChild(btn);
        buttons.push(btn);
      });

      // Wire “All” to clear our filter if present
      if(existing[0]){
        existing[0].addEventListener('click', ()=>{
          buttons.forEach(b=>setActive(b,false));
          cards.forEach(el => el.style.display='');
        });
      }
    } catch(_e){ /* silent fail — never break the page */ }
  });
})();
