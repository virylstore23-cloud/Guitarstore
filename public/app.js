/* App – Alesis Soundstage (no hero; embossed cards; white image block in detail) */
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ENV || {};

if (!window.supabase) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const CHIP_TO_CATEGORY = {
  'All': null,
  'Electronic Drum Kits': 'Drum Kits',
  'Multipads & Drum Machines': 'Accessories',
  'Drum Amplification': 'Drum Amps',
  'Accessories': 'Accessories'
};

const state = window.state || (window.state = {
  rows: [],
  byId: new Map(),
  filter: null,
  demoOnly: false
});

function formatAED(n){
  if (typeof n !== 'number') return '';
  return new Intl.NumberFormat('en-AE',{ style:'currency', currency:'AED', maximumFractionDigits:2 }).format(n);
}

/* ---------- RENDER ---------- */
function cardHTML(k){
  const img = k.primary_image_url || 'https://picsum.photos/seed/alesis/800/450';
  const cat = k.category || '—';
  const demo = k.on_demo ? `<span class="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px]">On demo</span>` : '';
  return `
  <article class="group rounded-2xl p-[1px] bg-gradient-to-br from-white/10 to-white/5">
    <div class="rounded-2xl bg-ink-800/70 ring-1 ring-white/10 shadow-emboss group-hover:shadow-emboss-lg transition">
      <div class="aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-white/5">
        <img src="${img}" alt="${k.name ?? ''}" class="h-full w-full object-cover object-center" onerror="this.src='https://picsum.photos/seed/alesis2/800/450'">
      </div>
      <div class="p-3 sm:p-4">
        <div class="text-[11px] opacity-60 truncate">${k.slug || ''}</div>
        <h3 class="text-base sm:text-lg font-semibold leading-tight line-clamp-2">${k.name ?? ''}</h3>
        <p class="mt-1 text-xs sm:text-sm opacity-80 line-clamp-1">${k.description ?? ''}</p>
        <div class="mt-2 text-brand-cyan font-semibold">${formatAED(Number(k.price))}</div>

        <div class="mt-3 flex items-center justify-between">
          <span class="text-[11px] px-2 py-1 rounded-full bg-ink-800/70 ring-1 ring-white/10">${cat}</span>
          <button class="btn px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm" data-open="${k.id}">Explore</button>
        </div>

        ${k.on_demo ? `<div class="mt-2 text-[11px] text-emerald-300/90">${k.on_demo_label ?? ''}</div>` : ``}
      </div>
    </div>
  </article>`;
}

function render(){
  const grid = document.getElementById('kitGrid');
  let rows = state.rows;

  if (state.filter){
    rows = rows.filter(r => (r.category || '') === state.filter);
  }
  if (state.demoOnly){
    rows = rows.filter(r => !!r.on_demo);
  }

  grid.innerHTML = rows.map(cardHTML).join('') || `
    <div class="col-span-full text-center text-sm opacity-70 py-8">No products found.</div>
  `;

  // wire "Explore" buttons
  grid.querySelectorAll('[data-open]').forEach(btn=>{
    btn.addEventListener('click', ()=> openDetail(btn.getAttribute('data-open')));
  });
}

/* ---------- DETAIL ---------- */
function openDetail(id){
  const k = state.byId.get(String(id));
  if(!k) return;
  document.getElementById('detailTitle').textContent = k.name ?? 'Details';
  document.getElementById('detailCategory').textContent = k.category || '';
  document.getElementById('detailName').textContent = k.name || '';
  document.getElementById('detailPrice').textContent = formatAED(Number(k.price)) || '';
  document.getElementById('detailDesc').textContent = k.description || '';

  const img = k.detail_image_url || k.primary_image_url || 'https://picsum.photos/seed/alesis3/1200/800';
  const elImg = document.getElementById('detailImg');
  elImg.src = img;
  elImg.alt = k.name || '';

  const ulF = document.getElementById('detailFeatures'); ulF.innerHTML = '';
  const ulC = document.getElementById('detailContents'); ulC.innerHTML = '';
  (Array.isArray(k.features) ? k.features : []).forEach(t=>{
    const li = document.createElement('li'); li.textContent = t; ulF.appendChild(li);
  });
  (Array.isArray(k.contents) ? k.contents : []).forEach(t=>{
    const li = document.createElement('li'); li.textContent = t; ulC.appendChild(li);
  });

  const demo = document.getElementById('detailDemo');
  if (k.on_demo){ demo.classList.remove('hidden'); document.getElementById('detailDemoLabel').textContent = k.on_demo_label || ''; }
  else { demo.classList.add('hidden'); }

  const wrap = document.getElementById('detailWrap');
  wrap.classList.remove('hidden');
}

function closeDetail(){
  document.getElementById('detailWrap').classList.add('hidden');
}

/* ---------- LOAD ---------- */
async function load(){
  const { data, error } = await supabase
    .from('drum_kits')
    .select('id,slug,name,description,price,category,features,contents,primary_image_url,detail_image_url,on_demo,on_demo_label,is_active')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error){ console.error('Load failed:', error); return; }
  state.rows = data || [];
  state.byId = new Map(state.rows.map(r => [String(r.id), r]));
  render();
}

/* ---------- EVENTS ---------- */
document.getElementById('btnFind')?.addEventListener('click', ()=>{
  const cards = document.getElementById('kitGrid');
  cards?.scrollIntoView({ behavior:'smooth', block:'start' });
});

document.querySelectorAll('[data-filter]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.filter = CHIP_TO_CATEGORY[btn.getAttribute('data-filter')] ?? null;
    render();
  });
});

document.getElementById('toggleDemo')?.addEventListener('change', (e)=>{
  state.demoOnly = !!e.target.checked;
  render();
});

document.getElementById('detailWrap')?.addEventListener('click', (e)=>{
  if (e.target?.dataset?.close) closeDetail();
});

/* ---------- BOOT + realtime ---------- */
await load();
supabase.channel('public:drum_kits')
  .on('postgres_changes',{event:'*',schema:'public',table:'drum_kits'},(p)=>{
    const id = String((p.new ?? p.old).id);
    if (p.eventType==='DELETE') state.byId.delete(id);
    else state.byId.set(id, p.new);
    state.rows = Array.from(state.byId.values()).filter(r => r.is_active);
    render();
  })
  .subscribe();
