/* Alesis Soundstage – chips + On Demo filter + Compare popup + Find-my-kit wizard */
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ENV || {};
if (!window.supabase) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/* map chip labels to table categories */
const CHIP_TO_CATEGORY = {
  'All': null,
  'Electronic Drum Kits': 'Drum Kits',
  'Multipads & Drum Machines': 'Accessories',
  'Drum Amplification': 'Drum Amps',
  'Accessories': 'Accessories',
  'On Demo': '__DEMO__'
};

const state = window.state || (window.state = {
  rows: [],
  byId: new Map(),
  filter: null,
  compare: new Set(), // holds IDs
  answers: {}
});

function AED(n){ return typeof n==='number' ? new Intl.NumberFormat('en-AE',{style:'currency',currency:'AED'}).format(n) : ''; }

function cardHTML(k){
  const img = k.primary_image_url || 'https://picsum.photos/seed/alesis/800/450';
  const cat = k.category || '—';
  const checked = state.compare.has(String(k.id)) ? 'checked' : '';
  return `
  <article class="group rounded-2xl p-[1px] bg-gradient-to-br from-white/10 to-white/5">
    <div class="rounded-2xl bg-ink-800/70 ring-1 ring-white/10 shadow-emboss group-hover:shadow-emboss-lg transition">
      <div class="relative">
        <div class="aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-white/5">
          <img src="${img}" alt="${k.name ?? ''}" class="h-full w-full object-cover object-center"
               onerror="this.src='https://picsum.photos/seed/alesis2/800/450'">
        </div>
        <!-- compare toggle -->
        <label class="absolute top-2 right-2 text-[11px] px-2 py-1 rounded bg-black/50 backdrop-blur ring-1 ring-white/20 flex items-center gap-1 cursor-pointer">
          <input type="checkbox" data-cmp="${k.id}" ${checked} class="accent-brand-cyan">
          <span>Compare</span>
        </label>
      </div>

      <div class="p-3 sm:p-4">
        <div class="text-[11px] opacity-60 truncate">${k.slug || ''}</div>
        <h3 class="text-base sm:text-lg font-semibold leading-tight line-clamp-2">${k.name ?? ''}</h3>
        <p class="mt-1 text-xs sm:text-sm opacity-80 line-clamp-1">${k.description ?? ''}</p>
        <div class="mt-2 text-brand-cyan font-semibold">${AED(Number(k.price))}</div>

        <div class="mt-3 flex items-center justify-between">
          <span class="text-[11px] px-2 py-1 rounded-full bg-ink-800/70 ring-1 ring-white/10">${cat}</span>
          <button class="btn btn-ghost px-3 py-1.5 rounded-lg text-sm" data-open="${k.id}">Explore</button>
        </div>

        ${k.on_demo ? `<div class="mt-2 text-[11px] text-emerald-300/90">On demo ${k.on_demo_label ? '· '+k.on_demo_label : ''}</div>` : ``}
      </div>
    </div>
  </article>`;
}

function render(){
  const grid = document.getElementById('kitGrid');
  let rows = state.rows;

  // filter by chip
  if (state.filter === '__DEMO__'){
    rows = rows.filter(r => !!r.on_demo);
  } else if (state.filter){
    rows = rows.filter(r => (r.category || '') === state.filter);
  }

  grid.innerHTML = rows.map(cardHTML).join('') || `<div class="col-span-full text-center opacity-70 py-8">No products.</div>`;

  // bind open-detail
  grid.querySelectorAll('[data-open]').forEach(btn=>{
    btn.addEventListener('click', ()=> openDetail(btn.getAttribute('data-open')));
  });

  // bind compare toggles
  grid.querySelectorAll('[data-cmp]').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      const id = String(cb.getAttribute('data-cmp'));
      if (cb.checked) state.compare.add(id); else state.compare.delete(id);
      updateCompareBadge();
    });
  });
}

function openDetail(id){
  const k = state.byId.get(String(id)); if (!k) return;
  document.getElementById('detailTitle').textContent   = k.name ?? 'Details';
  document.getElementById('detailCategory').textContent= k.category || '';
  document.getElementById('detailName').textContent    = k.name || '';
  document.getElementById('detailPrice').textContent   = AED(Number(k.price)) || '';
  document.getElementById('detailDesc').textContent    = k.description || '';
  const img = k.detail_image_url || k.primary_image_url || 'https://picsum.photos/seed/alesis3/1200/800';
  const el = document.getElementById('detailImg'); el.src = img; el.alt = k.name || '';

  const ulF = document.getElementById('detailFeatures'); ulF.innerHTML = '';
  const ulC = document.getElementById('detailContents'); ulC.innerHTML = '';
  (Array.isArray(k.features)?k.features:[]).forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ulF.appendChild(li); });
  (Array.isArray(k.contents)?k.contents:[]).forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ulC.appendChild(li); });
  const demo = document.getElementById('detailDemo');
  if (k.on_demo){ demo.classList.remove('hidden'); document.getElementById('detailDemoLabel').textContent=k.on_demo_label||''; }
  else demo.classList.add('hidden');

  document.getElementById('detailWrap').classList.remove('hidden');
}
function closeDetail(){ document.getElementById('detailWrap').classList.add('hidden'); }
document.getElementById('detailWrap')?.addEventListener('click', e=>{ if (e.target?.dataset?.close) closeDetail(); });

/* -------- Compare -------- */
function updateCompareBadge(){
  document.getElementById('cmpCount').textContent = String(state.compare.size);
}
document.querySelector('[data-open-compare]')?.addEventListener('click', ()=>{
  buildCompare();
  document.getElementById('compareWrap').classList.remove('hidden');
});
document.getElementById('compareWrap')?.addEventListener('click', e=>{ if (e.target?.dataset?.close) document.getElementById('compareWrap').classList.add('hidden'); });

function safe(v, fallback='—'){
  if (v===null || v===undefined || v==='') return fallback;
  if (typeof v==='boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}
function buildCompare(){
  const ids = Array.from(state.compare);
  const items = ids.map(id => state.byId.get(String(id))).filter(Boolean);
  const head = items.map(k=>`
    <th class="p-2 align-top">
      <div class="text-sm font-semibold">${safe(k.name,'—')}</div>
      <div class="text-xs opacity-70">${safe(k.category,'')}</div>
      <div class="text-brand-cyan font-semibold">${AED(Number(k.price))}</div>
    </th>`).join('');

  const row = (label, getter) => `
    <tr class="border-t border-white/10">
      <td class="p-2 text-xs opacity-70">${label}</td>
      ${items.map(k=>`<td class="p-2 text-sm">${safe(getter(k))}</td>`).join('')}
    </tr>`;

  const body = `
    <div class="overflow-auto">
      <table class="min-w-full text-left">
        <thead><tr><th class="p-2"></th>${head}</tr></thead>
        <tbody class="align-top">
          ${row('Module engine', k=>k.module_engine)}
          ${row('Factory kits',  k=>k.kits_factory)}
          ${row('User kits',     k=>k.kits_user)}
          ${row('Sounds',        k=>k.sounds)}
          ${row('USB-MIDI',      k=>k.usb_midi)}
          ${row('Bluetooth audio',k=>k.bluetooth_audio)}
          ${row('Toms (count)',  k=>k.toms_count)}
          ${row('Tom sizes',     k=>k.toms_sizes_in)}
          ${row('Snare zones',   k=>k.snare_zones)}
          ${row('Crash count',   k=>k.crash_count)}
          ${row('Ride zones',    k=>k.ride_zones)}
          ${row('Kick tower',    k=>k.kick_tower)}
        </tbody>
      </table>
    </div>`;
  document.getElementById('cmpBody').innerHTML = items.length ? body : '<div class="opacity-70 p-4">Select products to compare.</div>';
}

/* -------- Find-my-kit (smart scoring) -------- */
document.getElementById('btnFind')?.addEventListener('click', ()=>{
  document.getElementById('findWrap').classList.remove('hidden');
});
document.getElementById('findWrap')?.addEventListener('click', e=>{ if (e.target?.dataset?.close) document.getElementById('findWrap').classList.add('hidden'); });

// capture answers
document.querySelectorAll('[data-ans]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const [key,val] = btn.getAttribute('data-ans').split(':');
    state.answers[key]=val;
    btn.parentElement.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.getElementById('btnSuggest')?.addEventListener('click', ()=>{
  const ranked = scoreAndRank(state.rows, state.answers).slice(0,4);
  const out = document.getElementById('suggestOut');
  out.innerHTML = ranked.map(k => `
    <div class="rounded-xl ring-1 ring-white/10 bg-ink-800/60 p-3">
      <div class="aspect-[16/10] overflow-hidden rounded-lg bg-white/5">
        <img src="${k.primary_image_url || 'https://picsum.photos/seed/sg/800/450'}" class="w-full h-full object-cover">
      </div>
      <div class="mt-2 text-sm opacity-70">${k.category||''}</div>
      <div class="font-semibold">${k.name||''}</div>
      <div class="text-brand-cyan font-semibold">${AED(Number(k.price))}</div>
      <div class="mt-2 flex gap-2">
        <button class="btn btn-ghost px-3 py-1.5 rounded-lg text-sm" onclick="openDetail('${k.id}')">Explore</button>
        <button class="btn btn-ghost px-3 py-1.5 rounded-lg text-sm" onclick="(function(){state.compare.add('${k.id}');updateCompareBadge();buildCompare();document.getElementById('compareWrap').classList.remove('hidden');})();">Compare</button>
      </div>
    </div>
  `).join('');
});

// heuristic scoring
function scoreAndRank(items, a){
  const lvl = a.level||'intermediate';
  const bgt = a.budget||'>6000';
  const use = a.use||'practice';
  const space = a.space||'medium';
  const bt = a.bt||'no';

  function inRange(price, min, max){ return price>=min && price<=max; }
  function nearRange(price, min, max, pad=800){ return price>=min-pad && price<=max+pad; }

  return (items||[]).map(k=>{
    let s = 0;
    const p = Number(k.price)||0;

    // budget
    if (bgt === '<1500'){ if (inRange(p,0,1500)) s+=30; else if (nearRange(p,0,1500)) s+=10; }
    if (bgt === '1500-3000'){ if (inRange(p,1500,3000)) s+=30; else if (nearRange(p,1500,3000)) s+=10; }
    if (bgt === '3000-6000'){ if (inRange(p,3000,6000)) s+=30; else if (nearRange(p,3000,6000)) s+=10; }
    if (bgt === '>6000'){ if (p>6000) s+=30; else if (nearRange(p,6000,99999)) s+=10; }

    // level
    if (lvl==='beginner'){ if (p<=3000) s+=15; if ((k.kits_factory||0)<=40) s+=10; }
    if (lvl==='pro'){ if (p>=6000) s+=15; if ((k.kits_factory||0)>=60) s+=10; if ((k.ride_zones||0)>=2 || (k.crash_count||0)>=2) s+=10; }

    // use
    if (use==='practice'){ if (k.on_demo) s+=6; if ((k.learning_block||{}).coach) s+=6; }
    if (use==='recording'){ if (k.usb_midi) s+=12; if ((k.module_engine||'').toLowerCase().includes('bfd')) s+=12; }
    if (use==='live'){ if ((k.crash_count||0)>=2) s+=10; if ((k.ride_zones||0)>=2) s+=8; }

    // space
    if (space==='compact'){ if (k.kick_tower===false || (k.toms_count||0)<=3) s+=12; }
    if (space==='large'){ if (k.kick_tower===true || (k.toms_count||0)>=3) s+=8; }

    // bluetooth
    if (bt==='yes'){ if (k.bluetooth_audio) s+=12; else s-=6; }

    // slight bias for category = Drum Kits if user is choosing kits
    if ((CHIP_TO_CATEGORY['Electronic Drum Kits']) && k.category==='Drum Kits') s+=3;

    return { ...k, _score:s };
  }).sort((a,b)=> b._score - a._score);
}

/* -------- Load + realtime -------- */
async function load(){
  const { data, error } = await supabase
    .from('drum_kits')
    .select('id,slug,name,description,price,category,features,contents,primary_image_url,detail_image_url,on_demo,on_demo_label,is_active,usb_midi,bluetooth_audio,module_engine,kits_factory,kits_user,sounds,ride_zones,crash_count,kick_tower,toms_count,toms_sizes_in,learning_block')
    .eq('is_active', true)
    .order('price', { ascending:true });

  if (error){ console.error(error); return; }
  state.rows = data || [];
  state.byId = new Map(state.rows.map(r => [String(r.id), r]));
  render();
}
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

/* -------- Filter chip wiring -------- */
document.querySelectorAll('[data-filter]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const label = btn.getAttribute('data-filter');
    state.filter = CHIP_TO_CATEGORY[label] ?? null;
    render();
  });
});
updateCompareBadge();
