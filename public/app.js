/* ---------- tiny helpers ---------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const AED = n => new Intl.NumberFormat('en-AE',{style:'currency',currency:'AED',maximumFractionDigits:2}).format(+n||0);

const MAP = {
  'Electronic Drum Kits':'Drum Kits',
  'Drum Amplification':'Drum Amps',
  'Accessories':'Accessories'
};

const state = {
  rows: [],
  byId: new Map(),
  filterLabel: 'All',
  compare: new Set(JSON.parse(localStorage.getItem('compare')||'[]'))
};

/* ---------- Supabase (or REST) ---------- */
const getSB = () => (window && window.supabase) ? window.supabase : null;

async function load(){
  let rows = [];
  const sb = getSB();

  if (sb) {
    const { data, error } = await sb.from('drum_kits').select('*').order('price', { ascending:true });
    if (error) console.error(error);
    rows = data || [];
  } else {
    // REST fallback (uses env.js)
    const url = `${window.ENV.SUPABASE_URL}/rest/v1/drum_kits?select=*&order=price.asc`;
    const res = await fetch(url, {
      headers: {
        apikey: window.ENV.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${window.ENV.SUPABASE_ANON_KEY}`
      }
    });
    rows = await res.json();
  }

  // Treat NULL as active; only hide explicit false
  rows = (rows||[]).filter(r => r.is_active !== false);

  state.rows = rows;
  state.byId = new Map(rows.map(r => [String(r.id), r]));
  render();

  // realtime (only if SB client exists)
  const sb2 = getSB();
  if (sb2) {
    sb2.channel('public:drum_kits')
      .on('postgres_changes',{event:'*',schema:'public',table:'drum_kits'},(p)=>{
        const id = String((p.new ?? p.old).id);
        if (p.eventType==='DELETE') state.byId.delete(id);
        else state.byId.set(id, p.new);
        state.rows = [...state.byId.values()].filter(r => r?.is_active !== false);
        render();
      }).subscribe();
  }
}

/* ---------- filters ---------- */
function isDemo(r){
  return !!(r?.on_demo === true ||
           (Array.isArray(r?.labels) && r.labels.some(x=>/demo/i.test(x))) ||
           (Array.isArray(r?.tags)   && r.tags.some(x=>/demo/i.test(x))) ||
           /demo/.test(String(r?.badge||'')));
}
function looksLikeMultipad(r){
  const s = `${r?.name||''} ${r?.slug||''}`.toLowerCase();
  return /multipad|samplepad|sr-1|sr-18|drum machine/.test(s);
}

function currentList(){
  const f = state.filterLabel;
  if (f==='All') return state.rows;
  if (f==='On Demo') return state.rows.filter(isDemo);
  if (f==='Multipads & Drum Machines') return state.rows.filter(r => looksLikeMultipad(r));
  const cat = MAP[f];
  return state.rows.filter(r => r.category===cat);
}

/* ---------- render ---------- */
function render(){
  // header compare count
  $('#cmpCount').textContent = state.compare.size;

  const list = currentList();
  const grid = $('#grid');

  if (!list.length){
    grid.innerHTML = `
      <div class="muted" style="padding:18px;border:1px dashed #2b3642;border-radius:12px">
        No items match this view. Try clearing filters or check your 'is_active' flags.
      </div>`;
    return;
  }

  grid.innerHTML = list.map(r=>{
    const id = String(r.id);
    const img = r.image_url || r.image || r.main_image || r.photo || '';
    const demo = isDemo(r);
    const chips = buildChips(r).map(x=>`<span class="chip">${x}</span>`).join('');
    const sub = r.subtitle || r.short_desc || '';

    return `
    <div class="card">
      <div class="img">
        ${demo ? `<span class="demo-ribbon">On Demo</span>` : ``}
        ${img ? `<img loading="lazy" src="${img}" alt="${escapeHtml(r.name||'')}" onerror="this.style.display='none'; this.closest('.img').style.background='linear-gradient(180deg,#0f1720,#0c141b)';"/>` : ``}
      </div>
      <div class="body">
        <div class="price-pill">${AED(r.price)}</div>
        <div style="font-weight:800;margin-top:8px">${r.name||''}</div>
        <div class="muted" style="margin-top:4px">${escapeHtml(sub)}</div>
        <div class="chips" style="margin-top:8px">${chips}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
          <button class="btn btn-ghost" data-detail="${id}">Explore</button>
          <label class="muted" style="display:flex;gap:6px;align-items:center">
            <input type="checkbox" data-compare="${id}" ${state.compare.has(id)?'checked':''}/> Add to compare
          </label>
        </div>
      </div>
    </div>`;
  }).join('');
}

function buildChips(r){
  const out = [];
  if (String(r.name||'').toLowerCase().includes('mesh')) out.push('Mesh');
  if (r.usb_midi) out.push('USB/MIDI');
  if (r.bluetooth_audio) out.push('Bluetooth');
  if (r.kits_factory) out.push(`${r.kits_factory} kits`);
  return out.slice(0,4);
}

/* ---------- detail ---------- */
function openDetail(id){
  const r = state.byId.get(String(id));
  if (!r) return;

  $('#detailTitle').textContent = r.name || '';
  $('#detailPrice').textContent = AED(r.price);
  $('#detailDesc').textContent = r.description || (r.subtitle||'');

  // badges
  const badges = buildChips(r);
  $('#detailBadges').innerHTML = badges.map(b=>`<span class="chip">${b}</span>`).join('');

  // lists (features / contents if arrays or JSON)
  const lists = $('#detailLists');
  lists.innerHTML = '';
  const features = coerceArray(r.features);
  const contents = coerceArray(r.contents);
  if (features.length){
    lists.insertAdjacentHTML('beforeend', `
      <div class="section"><h4>Key Features</h4>
        <ul style="padding-left:18px;margin:0">${features.map(f=>`<li>${escapeHtml(f)}</li>`).join('')}</ul>
      </div>`);
  }
  if (contents.length){
    lists.insertAdjacentHTML('beforeend', `
      <div class="section"><h4>What's Included</h4>
        <ul style="padding-left:18px;margin:0">${contents.map(f=>`<li>${escapeHtml(f)}</li>`).join('')}</ul>
      </div>`);
  }

  // image in white block
  const img = r.image_url || r.image || r.main_image || r.photo || '';
  const el = $('#detailImg');
  el.src = img || '';
  el.alt = r.name || '';
  el.onload = ()=>{ el.style.display='block'; };
  el.onerror = ()=>{ el.style.display='none'; };

  $('#detailWrap').showModal();
}

function coerceArray(v){
  if (Array.isArray(v)) return v;
  if (typeof v === 'string'){
    try { const j = JSON.parse(v); return Array.isArray(j) ? j : []; } catch(_){ return []; }
  }
  return [];
}

/* ---------- compare ---------- */
function toggleCompare(id, checked){
  if (checked) state.compare.add(String(id));
  else state.compare.delete(String(id));
  localStorage.setItem('compare', JSON.stringify([...state.compare]));
  $('#cmpCount').textContent = state.compare.size;
}

function openCompare(){
  const ids = [...state.compare];
  const items = ids.map(id=>state.byId.get(id)).filter(Boolean);
  const box = $('#compareGrid');
  if (!items.length){
    box.innerHTML = `<div class="muted">No items selected. Tick “Add to compare” on any card.</div>`;
  } else {
    box.innerHTML = items.map(r=>`
      <div class="card">
        <div class="img">${r.image_url?`<img src="${r.image_url}" alt="${escapeHtml(r.name)}" onerror="this.style.display='none'"/>`:``}</div>
        <div class="body">
          <div class="price-pill">${AED(r.price)}</div>
          <div style="font-weight:800;margin-top:8px">${r.name}</div>
          <div class="chips" style="margin-top:8px">${buildChips(r).map(x=>`<span class="chip">${x}</span>`).join('')}</div>
        </div>
      </div>`).join('');
  }
  $('#compareModal').showModal();
}

/* ---------- wizard ---------- */
function openWizard(){ $('#wizard').showModal(); }

function suggest(){
  const budget = $('#wBudget').value;
  const conn   = $('#wConn').value;

  let [min,max] = [0, Infinity];
  if (/Under AED 2,000/i.test(budget)) [min,max]=[0,2000];
  else if (/2,000.*5,000/.test(budget)) [min,max]=[2000,5000];
  else if (/5,000.*9,000/.test(budget)) [min,max]=[5000,9000];
  else [min,max]=[9000,Infinity];

  const wantUsb = /USB\/MIDI/i.test(conn);

  const candidates = state.rows
    .filter(r => r.category==='Drum Kits' && r.price>=min && r.price<=max)
    .sort((a,b)=> (a.price-b.price));

  const pick = (wantUsb ? candidates.find(r=>r.usb_midi) : candidates[0]) || candidates[0];

  const out = $('#wizOut');
  if (!pick) { out.innerHTML = `<div class="muted">No match found for that budget.</div>`; return; }

  out.innerHTML = `
    <div class="card">
      <div class="img">${pick.image_url?`<img src="${pick.image_url}" alt="${escapeHtml(pick.name)}" onerror="this.style.display='none'"/>`:``}</div>
      <div class="body">
        <div class="pill good">Your Match</div>
        <div style="font-weight:800;margin-top:8px">${pick.name}</div>
        <div class="price-pill" style="margin-top:8px">${AED(pick.price)}</div>
        <div class="muted" style="margin-top:8px">Chosen for your budget and preferences.</div>
        <div style="margin-top:10px">
          <button class="btn btn-primary" data-detail="${pick.id}">View This Kit</button>
        </div>
      </div>
    </div>`;
}

/* ---------- events ---------- */
// chips
$$('[data-filter]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('[data-filter]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.filterLabel = btn.getAttribute('data-filter');
    render();
  });
});

// header buttons
$('#btnWizard').addEventListener('click', openWizard);
$('#btnCompare').addEventListener('click', openCompare);

// close any dialog
document.body.addEventListener('click', (e)=>{
  if (e.target?.dataset?.close){
    const dlg = e.target.closest('dialog'); dlg?.close();
  }
});

// explore + compare (event delegation)
document.body.addEventListener('click', (e)=>{
  const d = e.target.closest('[data-detail]'); 
  if (d) openDetail(d.dataset.detail);

  const c = e.target.closest('input[data-compare]');
  if (c) toggleCompare(c.dataset.compare, c.checked);
});

// wizard "Get Recommendation"
$('#btnSuggest').addEventListener('click', suggest);

/* ---------- utils ---------- */
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

/* ---------- boot ---------- */
load();
