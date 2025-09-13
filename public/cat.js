(function(){
  const byText = (root, txt) =>
    Array.from(root.querySelectorAll('button,a,span,div')).find(n =>
      new RegExp(`\\b${txt}\\b`, 'i').test(n.textContent||''));

  function uniqCats(kits){
    const set = new Set();
    kits.forEach(k=>{
      let cs=[];
      if (Array.isArray(k.categories)) cs = cs.concat(k.categories);
      if (typeof k.category === 'string') cs.push(k.category);
      if (Array.isArray(k.tags)) cs = cs.concat(k.tags);
      cs.filter(Boolean).map(String).forEach(v=>set.add(v.trim()));
    });
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }

  async function main(){
    const res  = await fetch('/api/kits').catch(()=>null);
    const json = res ? await res.json() : {kits:[]};
    const kits = Array.isArray(json.kits) ? json.kits : [];

    // Find the existing filter chips (“All”, “On Demo”)
    const root = document.body;
    const allBtn  = byText(root,'All');
    const demoBtn = byText(root,'On Demo');
    if(!allBtn || !demoBtn) return;

    // Make a bar right after that button row
    const bar = document.createElement('div');
    bar.className = 'cat-bar';
    demoBtn.parentElement.parentElement.insertAdjacentElement('afterend', bar);

    // Map cards by UPC so we can toggle them
    const cardByUpc = new Map();
    document.querySelectorAll('*').forEach(n=>{
      const m = /UPC:\s*(\d{10,})/i.exec(n.textContent||'');
      if(m){
        let card = n.closest('[class*=rounded],[class*=shadow],[class*=card]') || n.closest('div');
        if(card) cardByUpc.set(m[1], card);
      }
    });

    // Tag each card with its categories
    const tagOne = k=>{
      const upc = String(k.upc||k.UPC||k.barcode||'');
      const card = cardByUpc.get(upc); if(!card) return;
      const cats = uniqCats([k]);
      card.dataset.categories = cats.map(c=>c.toLowerCase()).join('|');
    };
    kits.forEach(tagOne);

    // Build chips from real Supabase-backed data
    const cats = uniqCats(kits);
    const make = label => {
      const b = document.createElement('button');
      b.className = 'cat-chip';
      b.textContent = label;
      return b;
    };

    cats.forEach(c=>{
      const chip = make(c);
      chip.addEventListener('click', ()=>{
        bar.querySelectorAll('.cat-chip').forEach(x=>x.classList.toggle('active', x===chip));
        const key = c.toLowerCase();
        cardByUpc.forEach(card=>{
          const pool = (card.dataset.categories||'').split('|');
          card.style.display = pool.some(v=>v===key) ? '' : 'none';
        });
        allBtn.classList.remove('active'); demoBtn.classList.remove('active');
      });
      bar.appendChild(chip);
    });

    // “All” clears the category filter
    allBtn.addEventListener('click', ()=>{
      bar.querySelectorAll('.cat-chip').forEach(x=>x.classList.remove('active'));
      cardByUpc.forEach(card=>card.style.display='');
    });
  }

  window.addEventListener('DOMContentLoaded', ()=>{ main().catch(()=>{}); });
})();
