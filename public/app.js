/* ===== helpers ===== */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const AED = (n) => new Intl.NumberFormat('en-AE',{style:'currency',currency:'AED',maximumFractionDigits:2}).format(n ?? 0);

/* Placeholder (inline SVG) */
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <rect width="100%" height="100%" fill="#f4f6f8"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui,Segoe UI,Arial" font-size="22" fill="#8a97a6">
    Image coming soon
  </text></svg>`);

/* Image pickers */
const first = (a) => Array.isArray(a) && a.length ? a[0] : null;
function pickCardImage(r){
  return r?.primary_image_url || r?.image_url || first(r?.images) ||
         (r?.image_path ? `${window.ENV.SUPABASE_URL}/storage/v1/object/public/${r.image_path}` : null) ||
         PLACEHOLDER;
}
function pickDetailImage(r){
  return r?.detail_image_url || r?.primary_image_url || r?.image_url || first(r?.images) ||
         (r?.image_path ? `${window.ENV.SUPABASE_URL}/storage/v1/object/public/${r.image_path}` : null) ||
         PLACEHOLDER;
}

/* Robust list parser (accepts array or string with bullets/commas/newlines) */
function toList(val){
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string'){
    return val.split(/\r?\n|•|,| - /).map(s=>s.trim()).filter(Boolean);
  }
  return [];
}

/* ===== state ===== */
const state = {
  rows: [],
  byId: new Map(),
  filterLabel: 'All',
  compare: new Set(),
};

/* Filter mapping (labels → category) */
const CHIP_TO_CAT = {
  'All': null,
  'Electronic Drum Kits': 'Drum Kits',
  'Multipads & Drum Machines': 'Accessories',
  'Drum Amplification': 'Drum Amps',
  'Accessories': 'Accessories',
  'On Demo': '__DEMO__',
};

/* ===== data load ===== */
function getSB(){ return window?.supabase || null; }

async function load(){
  let rows = [];
  const sb = getSB();
  if (sb){
    const { data, error } = await sb
      .from('drum_kits')
      .select('*')
      .order('price', { ascending: true });
    if (error) console.error('Supabase error:', error);
    rows = data || [];
  } else {
    const url = `${window.ENV.SUPABASE_URL}/rest/v1/drum_kits?select=*&order=price.asc`;
    const res = await fetch(url, {
      headers:{
        apikey: window.ENV.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${window.ENV.SUPABASE_ANON_KEY}`
      }
    });
    rows = await res.json();
  }
  // treat NULL as active; only hide explicit false
  rows = rows.filter(r => r.is_active !== false);

  state.rows = rows;
  state.byId = new Map(rows.map(r => [String(r.id), r]));
  render();

  // realtime (only if client exists)
  if (sb){
    sb.channel('public:drum_kits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drum_kits' }, (p)=>{
        const id = String((p.new ?? p.old).id);
        if (p.eventType==='DELETE') state.byId.delete(id);
        else state.byId.set(id, p.new);
        state.rows = [...state.byId.values()].filter(r => r?.is_active !== false);
        render();
      })
      .subscribe();
  }
}

/* ===== rendering ===== */
function render(){
  const grid = $('#grid');
  let list = [...state.rows];

  const lab = state.filterLabel;
  const cat = CHIP_TO_CAT[lab] ?? null;

  if (cat === '__DEMO__') list = list.filter(r => r.on_demo === true);
  else if (cat) list = list.filter(r => r.category === cat);

  const html = list.map(r => renderCard(r)).join('');
  grid.innerHTML = html || `
    <div class="muted" style="padding:18px;border:1px dashed #2b3642;border-radius:12px">
      No items match this view.
    </div>`;

  // wire up
  $$('#grid [data-explore]').forEach(b => b.addEventListener('click', e => openDetail(e.currentTarget.dataset.explore)));
  $$('#grid [data-compare]').forEach(cb => {
    cb.addEventListener('change', (e)=>{
      const id = String(e.currentTarget.dataset.compare);
      if (e.currentTarget.checked) state.compare.add(id); else state.compare.delete(id);
      updateCompareBadge();
    });
  });
}

function renderCard(r){
  const img = pickCardImage(r);
  const demo = r?.on_demo ? `<div class="demo-ribbon">${r.on_demo_label || 'On Demo'}</div>` : '';
  return `
  <div class="card">
    <div class="imgbox">
      ${demo}
      <img src="${img}" alt="${(r?.name||'').replace(/"/g,'&quot;')}" loading="lazy"
           onerror="this.src='${PLACEHOLDER}'">
    </div>
    <div class="content">
      <div class="price-chip">${AED(r.price)}</div>
      <div class="title">${r?.name ?? ''}</div>
      <div class="actions">
        <button class="btn btn-ghost" data-explore="${r.id}">Explore</button>
        <label class="compare"><input type="checkbox" data-compare="${r.id}"> Add to compare</label>
      </div>
    </div>
  </div>`;
}

function updateCompareBadge(){
  const n = state.compare.size;
  const el = $('#cmpCount');
  if (el) el.textContent = n;
}

/* ===== detail modal ===== */
function openDetail(id){
  const r = state.byId.get(String(id));
  if (!r) return;

  const img = pickDetailImage(r);
  const features = toList(r?.features);
  const contents = toList(r?.contents);

  const dlg = $('#detailWrap');
  dlg.innerHTML = `
  <div class="detail">
    <div class="detail-head">
      <div class="name">${r?.name ?? ''}</div>
      <button class="x" data-close="1">Close</button>
    </div>

    <div class="detail-body">
      <div class="left">
        <div class="imgPaper"><img src="${img}" alt="${(r?.name||'').replace(/"/g,'&quot;')}"
          onerror="this.src='${PLACEHOLDER}'"></div>
        <div class="chips">
          <span class="chip price">${AED(r?.price)}</span>
          ${r?.upc ? `<span class="chip">UPC: ${r.upc}</span>` : ''}
        </div>
      </div>

      <div class="right">
        ${r?.description ? `
          <div class="section">
            <h4>Description</h4>
            <div class="muted">${r.description}</div>
          </div>` : ''}

        ${features.length ? `
          <div class="section">
            <h4>Key Features</h4>
            <ul>${features.map(f=>`<li>${f}</li>`).join('')}</ul>
          </div>` : ''}

        ${contents.length ? `
          <div class="section">
            <h4>What's Included</h4>
            <ul>${contents.map(c=>`<li>${c}</li>`).join('')}</ul>
          </div>` : ''}
      </div>
    </div>
  </div>`;

  dlg.showModal();
  dlg.addEventListener('click', (e)=>{ if (e.target?.dataset?.close) dlg.close(); }, { once:true });
}

/* ===== header controls ===== */
$$('[data-filter]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('[data-filter]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.filterLabel = btn.getAttribute('data-filter');
    render();
  });
});

/* boot */
await load();
