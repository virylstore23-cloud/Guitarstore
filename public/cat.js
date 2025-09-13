/** Category chips from /api/kits; filters #kitGrid [data-category]; safe/no-break */
(function () {
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
  ready(async () => {
    try {
      const r = await fetch('/api/kits', {cache:'no-store'});
      const data = await r.json();
      const kits = Array.isArray(data?.kits) ? data.kits : [];
      if (!kits.length) return;

      const hostRow = document.querySelector('.flex.flex-wrap.gap-2') || document.querySelector('main');
      if (!hostRow) return;

      const sampleChip = document.querySelector('button.chip') || document.querySelector('button');
      const baseClass = sampleChip ? sampleChip.className : 'px-3 py-1.5 rounded-lg border border-zinc-500/40 text-zinc-200';

      const cats = Array.from(new Set(kits.map(k => (k.category||'').trim()).filter(Boolean)))
        .sort((a,b)=>a.localeCompare(b));
      if (!cats.length) return;

      const row = document.createElement('div');
      Object.assign(row.style,{display:'flex',flexWrap:'wrap',gap:'0.5rem',marginTop:'0.75rem',position:'relative',zIndex:'50'});
      hostRow.parentElement.insertBefore(row, hostRow.nextSibling);

      const cards = Array.from(document.querySelectorAll('#kitGrid [data-category]'));

      function setActive(el,on){
        el.classList.toggle('bg-blue-600', on);
        el.classList.toggle('text-white', on);
      }

      const buttons=[];
      cats.forEach(cat=>{
        const btn=document.createElement('button');
        btn.type='button';
        btn.className=baseClass;
        btn.textContent=cat;
        btn.setAttribute('data-cat',cat);
        btn.style.cursor='pointer';
        btn.addEventListener('click',()=>{
          buttons.forEach(b=>setActive(b,b===btn));
          const want=cat.toLowerCase();
          cards.forEach(card=>{
            const has=(card.getAttribute('data-category')||'').toLowerCase();
            card.style.display = (has===want) ? '' : 'none';
          });
        });
        row.appendChild(btn);
        buttons.push(btn);
      });

      // Make the existing "All" chip clear our filter
      const allChip = Array.from(document.querySelectorAll('button.chip,button'))
        .find(b=>/^\s*all\s*$/i.test(b.textContent||''));
      if (allChip){
        allChip.addEventListener('click',()=>{
          buttons.forEach(b=>setActive(b,false));
          cards.forEach(card=>{card.style.display='';});
        });
      }
    } catch(_e){ /* never break the page */ }
  });
})();
