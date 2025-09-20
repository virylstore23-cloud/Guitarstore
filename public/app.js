/* --- ENV + Supabase client --- */
const { SUPABASE_URL, SUPABASE_ANON_KEY } = (window.ENV||{});
if(!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('env.js missing');
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
window.supabase = window.supabase || createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* --- State --- */
const state = {
  all: [],
  byId: new Map(),
  filterCategory: 'all',  // 'all' | 'Drum Kits' | 'Drum Amps' | 'Accessories'
  demoOnly: false
};

/* --- Helpers --- */
const money = n => (n==null ? '—' : 'AED ' + Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#0b0f14"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#80eaff" font-family="Arial" font-size="18">Image coming soon</text></svg>`);

/* --- Load --- */
async function loadKits(){
  const { data, error } = await window.supabase
    .from('drum_kits')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });
  if(error){ console.error(error); return; }
  state.all = data || [];
  state.byId = new Map(state.all.map(k => [String(k.id), k]));
  render();
}

/* --- Filters & render --- */
function filtered(){
  return state.all.filter(k=>{
    const catOK = (state.filterCategory==='all') || ((k.category||'').toLowerCase() === state.filterCategory.toLowerCase());
    const demoOK = state.demoOnly ? !!(k.on_demo || (k.on_demo_label||'').toLowerCase().includes('demo')) : true;
    return catOK && demoOK;
  });
}

function render(){
  const grid = document.getElementById('kitGrid');
  grid.innerHTML = '';
  const list = filtered();
  if(!list.length){
    grid.innerHTML = `<div class="col-span-full text-center text-zinc-400">No items found.</div>`;
    return;
  }
  list.forEach(k => grid.appendChild(card(k)));
}

function card(k){
  const el = document.createElement('article');
  el.className = 'glass rounded-xl p-3 border border-zinc-700/70 hover:border-zinc-500 transition-colors';
  el.innerHTML = `
    <figure class="img-frame img-16x10 border border-zinc-700/70 mb-2 cursor-pointer">
      <img class="img-cover" alt="${k.name||''}"
           src="${k.primary_image_url || k.detail_image_url || PLACEHOLDER}"
           onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
      ${k.on_demo?`<div class="absolute top-2 left-2 chip bg-emerald-700/70 border-emerald-500/50">On demo</div>`:''}
    </figure>
    <div class="text-xs text-zinc-400 mb-1">${k.slug||''}</div>
    <h3 class="font-semibold leading-tight">${k.name||'Unnamed'}</h3>
    <p class="text-sm text-zinc-300 line-clamp-2">${(k.description||'').trim() || 'Details coming soon.'}</p>
    <div class="mt-1 price">${money(k.price)}</div>
    <div class="mt-2 flex items-center justify-between">
      <button class="btn-ghost px-3 py-1 rounded-lg text-sm" data-open="${k.id}">Explore</button>
      <span class="text-xs text-zinc-400">${k.category||''}</span>
    </div>
  `;
  el.querySelector('[data-open]').addEventListener('click', ()=> openDetail(k.id));
  el.querySelector('figure').addEventListener('click', ()=> openDetail(k.id));
  return el;
}

/* --- Detail Modal --- */
let detail;
function ensureDetail(){
  if(detail) return detail;
  const m = document.createElement('div');
  m.className = 'fixed inset-0 hidden items-center justify-center z-50';
  m.innerHTML = `
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div role="dialog" aria-modal="true" class="relative bg-base-800 border border-zinc-700 rounded-2xl shadow-soft w-[min(960px,92vw)] max-h-[90vh] overflow-auto">
      <div class="flex items-center justify-between border-b border-zinc-700 p-3">
        <h2 id="dTitle" class="text-lg font-bold">Details</h2>
        <button id="dClose" class="btn-ghost px-3 py-1 rounded-lg">Close</button>
      </div>
      <div class="p-4 grid md:grid-cols-2 gap-4">
        <div class="img-frame img-16x10 border border-zinc-700"><img id="dImg" class="img-contain" alt=""></div>
        <div>
          <div class="mb-2 flex flex-wrap gap-2">
            <span id="dPrice" class="price"></span>
            <span id="dUPC" class="chip"></span>
            <span id="dDemo" class="chip"></span>
          </div>
          <div class="glass rounded-xl p-3 border border-zinc-700">
            <h3 class="font-semibold text-brand-cyan">Description</h3>
            <p id="dDesc" class="text-sm text-zinc-200 mt-1"></p>
          </div>
          <div class="grid md:grid-cols-2 gap-3 mt-3">
            <div class="glass rounded-xl p-3 border border-zinc-700">
              <h3 class="font-semibold text-brand-cyan">Key Features</h3>
              <ul id="dFeat" class="list-disc ml-5 mt-1 space-y-1 text-sm text-zinc-200"></ul>
            </div>
            <div class="glass rounded-xl p-3 border border-zinc-700">
              <h3 class="font-semibold text-brand-cyan">What's Included</h3>
              <ul id="dCont" class="list-disc ml-5 mt-1 space-y-1 text-sm text-zinc-200"></ul>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e=>{ if(e.target===m) close(); });
  m.querySelector('#dClose').addEventListener('click', close);
  detail = m;
  return m;
}
function close(){ detail.classList.add('hidden'); detail.classList.remove('flex'); }
function openDetail(id){
  const k = state.byId.get(String(id)); if(!k) return;
  const m = ensureDetail();
  m.querySelector('#dTitle').textContent = k.name || 'Details';
  const img = m.querySelector('#dImg');
  img.src = k.detail_image_url || k.primary_image_url || PLACEHOLDER;
  img.alt = k.name||'';
  m.querySelector('#dPrice').textContent = money(k.price);
  m.querySelector('#dUPC').textContent = k.upc_code ? `UPC: ${k.upc_code}` : '';
  m.querySelector('#dDemo').textContent = k.on_demo ? (k.on_demo_label || 'On demo') : '';
  m.querySelector('#dDesc').textContent = (k.description||'').trim() || 'Details coming soon.';
  const ulF = m.querySelector('#dFeat'); ulF.innerHTML='';
  (Array.isArray(k.features)?k.features:[]).forEach(x=>{ const li=document.createElement('li'); li.textContent = x; ulF.appendChild(li); });
  const ulC = m.querySelector('#dCont'); ulC.innerHTML='';
  (Array.isArray(k.contents)?k.contents:[]).forEach(x=>{ const li=document.createElement('li'); li.textContent = x; ulC.appendChild(li); });
  m.classList.remove('hidden'); m.classList.add('flex');
}

/* --- UI wiring --- */
document.getElementById('btnBrowse')?.addEventListener('click', ()=>{
  document.getElementById('catalog').scrollIntoView({behavior:'smooth', block:'start'});
});
document.getElementById('btnBest')?.addEventListener('click', ()=>{
  // cheapest active Drum Kit
  state.filterCategory = 'Drum Kits'; document.querySelector('[data-filter="Drum Kits"]')?.classList.add('ring-focus');
  const kits = filtered().filter(k=>(k.category||'').toLowerCase()==='drum kits');
  if(!kits.length) return document.getElementById('catalog').scrollIntoView({behavior:'smooth'});
  const cheapest = kits.reduce((a,b)=> (a?.price??Infinity) <= (b?.price??Infinity) ? a : b);
  document.getElementById('catalog').scrollIntoView({behavior:'smooth'});
  setTimeout(()=>openDetail(cheapest.id), 250);
});
document.getElementById('btnFind')?.addEventListener('click', ()=>{
  // very light finder: pick a mid-priced kit
  const kits = state.all.filter(k=>(k.category||'').toLowerCase()==='drum kits');
  if(!kits.length) return;
  const mid = kits[Math.floor(kits.length/2)];
  openDetail(mid.id);
});

// filter chips + demo toggle
document.querySelectorAll('[data-filter]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('ring-focus'));
    btn.classList.add('ring-focus');
    state.filterCategory = btn.getAttribute('data-filter');
    render();
  });
});
document.getElementById('toggleDemo')?.addEventListener('change', (e)=>{
  state.demoOnly = !!e.target.checked;
  render();
});

/* --- Boot --- */
await loadKits();
