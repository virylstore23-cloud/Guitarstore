(function(){
  const $ = (id)=>document.getElementById(id);
  const uniq = (a)=>[...new Set(a)];
  const safeArr = (v)=>{
    if(Array.isArray(v)) return v;
    if(typeof v==='string' && v.trim()){
      try{ const a = JSON.parse(v); return Array.isArray(a)?a:[] }catch(_){ return [] }
    }
    return [];
  };

  let KITS = [];
  let FILTER = {category:"All", demo:false};

  function renderChips(){
    const host = $("category-chips"); if(!host) return;
    const cats = uniq(["All","On Demo", ...KITS.map(k=>k.category).filter(Boolean)]);
    host.innerHTML = cats.map(c=>{
      const active = (c==="On Demo") ? FILTER.demo : (FILTER.category===c);
      return `<button class="chip ${active?'is-active':''}" data-chip="${c}">${c}</button>`;
    }).join("");
    host.querySelectorAll("button[data-chip]").forEach(b=>{
      b.onclick = ()=>{
        const v=b.dataset.chip;
        if(v==="All"){ FILTER={category:"All", demo:false}; }
        else if(v==="On Demo"){ FILTER={category:"All", demo:true}; }
        else { FILTER={category:v, demo:false}; }
        renderChips(); renderGrid();
      }
    });
  }

  function curRows(){
    return KITS.filter(k=>{
      if(FILTER.demo) return k.on_demo===true;
      if(FILTER.category!=="All") return k.category===FILTER.category;
      return true;
    });
  }

  function renderGrid(){
    const grid = $("kits-grid"); if(!grid) return;
    grid.innerHTML = curRows().map(k=>{
      const img = k.primary_image_url || k.detail_image_url || "";
      return `<article class="kit-card rounded-xl border border-neutral-700 bg-neutral-900/40 overflow-hidden" data-name="${k.name}">
        <div class="aspect-video bg-black"><img src="${img}" alt="${k.name}"></div>
        <div class="p-3">
          <div class="font-semibold">${k.name}</div>
          <div class="text-xs text-neutral-400 mt-1">${k.category||""}</div>
        </div>
      </article>`;
    }).join("");

    grid.querySelectorAll('.kit-card').forEach(card=>{
      card.onclick = ()=>{
        const name = card.dataset.name;
        const k = KITS.find(x=>x.name===name);
        if(k) openModal(k);
      };
    });
  }

  function keyFeatures(row){
    const a = safeArr(row.features);
    if(a.length) return a;
    // light auto-features from specs if present
    const s = (row.specs && (typeof row.specs==="string"? JSON.parse(row.specs): row.specs))||{};
    const r=[];
    if(s.module?.engine) r.push(`Module: ${s.module.engine}`);
    if(s.module?.kits_factory) r.push(`${s.module.kits_factory} factory kits`);
    if(s.pads?.snare?.zones) r.push(`${s.pads.snare.zones}-zone snare`);
    if(s.pads?.toms?.count) r.push(`${s.pads.toms.count} toms`);
    if(s.io?.bluetooth_audio) r.push(`Bluetooth Audio`);
    if(s.io?.usb_midi) r.push(`USB MIDI`);
    return r;
  }
  const whatsIncluded = (row)=>safeArr(row.contents);

  function openModal(k){
    const feats = keyFeatures(k);
    const incl = whatsIncluded(k);
    const featsHtml = (feats.length?feats:[`Details coming soon`]).map(x=>`<li>${x}</li>`).join("");
    const inclHtml  = (incl.length?incl:[`Details coming soon`]).map(x=>`<li>${x}</li>`).join("");

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div class="max-w-5xl w-full rounded-2xl bg-neutral-900 border border-neutral-700 overflow-hidden">
          <div class="flex items-center justify-between p-3 border-b border-neutral-800">
            <div class="text-lg font-semibold">${k.name}</div>
            <button id="mclose" class="chip">Close</button>
          </div>
          <div class="grid md:grid-cols-2 gap-4 p-4">
            <div class="bg-black aspect-video rounded-lg overflow-hidden">
              <img src="${k.detail_image_url || k.primary_image_url || ''}" alt="${k.name}">
            </div>
            <div class="space-y-3">
              <div class="flex gap-2 flex-wrap">
                <span class="chip">AED ${k.price || '-'}</span>
                ${k.upc_code?`<span class="chip">UPC: ${k.upc_code}</span>`:''}
                ${k.on_demo?`<span class="chip">${k.on_demo_label||'On Demo'}</span>`:''}
              </div>
              <section class="modal-section">
                <h3>Description</h3>
                <div class="text-sm">${k.description||''}</div>
              </section>
              <section class="modal-section">
                <h3>Key Features</h3>
                <ul>${featsHtml}</ul>
              </section>
              <section class="modal-section">
                <h3>What’s Included</h3>
                <ul>${inclHtml}</ul>
              </section>
            </div>
          </div>
        </div>
      </div>`;
    const node = wrap.firstElementChild;
    document.body.appendChild(node);
    node.querySelector('#mclose').onclick = ()=> node.remove();
    node.addEventListener('click', (e)=>{ if(e.target===node) node.remove(); });
  }

  async function boot(){
    try{
      const r = await fetch('/api/kits');
      const data = await r.json();
      KITS = Array.isArray(data) ? data : [];
    }catch(_){ KITS = []; }
    renderChips(); renderGrid();
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
