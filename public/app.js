/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const AED=n=>`AED ${Number(n).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const PLACEHOLDER='data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#f4f6f8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="22" fill="#8a97a6">Image coming soon</text></svg>`);
const getSB=()=>window?.supabase||null;

/* ---------- state ---------- */
const state={rows:[],byId:new Map(),filterLabel:'All',compare:new Set()};

/* ---------- image picking ---------- */
function pickImage(r){
  const direct=r?.primary_image_url||r?.detail_image_url||r?.image_url||(Array.isArray(r?.images)?r.images[0]:null);
  const fromStorage=r?.image_path?`${window.ENV.SUPABASE_URL}/storage/v1/object/public/${r.image_path}`:null;
  return direct||fromStorage||PLACEHOLDER;
}

/* ---------- load + realtime ---------- */
async function load(){
  const sb=getSB(); let rows=[];
  try{
    if(sb){
      const {data,error}=await sb.from('drum_kits').select('*').order('price',{ascending:true});
      if(error) throw error; rows=data||[];
    }else{
      const url=`${window.ENV.SUPABASE_URL}/rest/v1/drum_kits?select=*&order=price.asc`;
      const res=await fetch(url,{headers:{apikey:window.ENV.SUPABASE_ANON_KEY,Authorization:`Bearer ${window.ENV.SUPABASE_ANON_KEY}`}});
      rows=await res.json();
    }
  }catch(e){ console.error('Load error:',e); rows=[]; }
  rows=rows.filter(r=>r.is_active!==false);
  state.rows=rows; state.byId=new Map(rows.map(r=>[String(r.id),r]));
  render();

  if(sb){
    sb.channel('public:drum_kits')
      .on('postgres_changes',{event:'*',schema:'public',table:'drum_kits'},p=>{
        const id=String((p.new??p.old).id);
        if(p.eventType==='DELETE') state.byId.delete(id); else state.byId.set(id,p.new);
        state.rows=[...state.byId.values()].filter(r=>r?.is_active!==false); render();
      }).subscribe();
  }
}

/* ---------- filters ---------- */
const MULTIPADS=new Set(['strike-multipad','samplepad-pro','samplepad-4','sr-16','sr-18']);
function filteredRows(){
  let rows=[...state.byId.values()].filter(r=>r?.is_active!==false);
  const f=state.filterLabel;
  if(!f||f==='All') return rows;
  if(f==='On Demo') return rows.filter(r=>!!r.on_demo);
  if(f==='Electronic Drum Kits') return rows.filter(r=>r.category==='Drum Kits');
  if(f==='Drum Amplification') return rows.filter(r=>r.category==='Drum Amps');
  if(f==='Accessories') return rows.filter(r=>r.category==='Accessories'&&!MULTIPADS.has(r.slug));
  if(f==='Multipads & Drum Machines') return rows.filter(r=>MULTIPADS.has(r.slug));
  return rows;
}

/* ---------- cards ---------- */
function renderCard(r){
  const checked=state.compare.has(String(r.id))?'checked':'';
  return `
  <div class="card" data-id="${r.id}">
    <div class="imgbox"><img src="${pickImage(r)}" alt="${(r?.name||'').replace(/"/g,'&quot;')}" loading="lazy"></div>
    <div class="content">
      <div class="title">${r.name||''}</div>
      <div class="desc">${r.subtitle||''}</div>
      <div class="price chip">${AED(r.price)}</div>
      ${r.upc?`<div class="muted small">UPC: ${r.upc}</div>`:''}
      <div class="row">
        <button class="btn btn-ghost" data-explore="${r.id}">Explore</button>
        <label class="compare"><input type="checkbox" data-compare="${r.id}" ${checked}> Add to compare</label>
      </div>
    </div>
  </div>`;
}

/* ---------- detail ---------- */
function openDetail(id){
  const r=state.byId.get(String(id)); if(!r) return;
  const html=`
  <dialog id="detail" class="detail open">
    <div class="sheet">
      <div class="head"><div class="title">${r.name||''}</div><button class="x" data-close="1">Close</button></div>
      <div class="body">
        <div class="left">
          <div class="imgwrap"><img src="${pickImage(r)}" alt=""></div>
          <div class="chips"><span class="chip price">${AED(r.price)}</span>${r.on_demo?`<span class="chip">${r.on_demo_label||'On Demo'}</span>`:''}</div>
        </div>
        <div class="right">
          ${r.description?`<div class="section"><h4>Description</h4><div class="muted">${r.description}</div></div>`:''}
          ${Array.isArray(r.features)&&r.features.length?`<div class="section"><h4>Key Features</h4><ul>${r.features.map(f=>`<li>${f}</li>`).join('')}</ul></div>`:''}
          ${Array.isArray(r.contents)&&r.contents.length?`<div class="section"><h4>What's Included</h4><ul>${r.contents.map(c=>`<li>${c}</li>`).join('')}</ul></div>`:''}
        </div>
      </div>
    </div>
  </dialog>`;
  const wrap=document.createElement('div'); wrap.innerHTML=html; document.body.appendChild(wrap.firstElementChild);
  const dlg=$('#detail'); dlg.showModal();
  dlg.addEventListener('click',e=>{if(e.target?.dataset?.close) dlg.close();});
  dlg.addEventListener('close',()=>dlg.remove());
}

/* ---------- compare ---------- */
function specOf(r){
  return {
    Price: AED(r.price),
    Category: r.category||'—',
    'On demo': r.on_demo ? (r.on_demo_label||'Yes') : 'No',
    'Factory kits': r.kits_factory ?? '—',
    'USB/MIDI': r.usb_midi ? 'Yes' : 'No',
    Bluetooth: r.bluetooth_audio ? 'Yes' : 'No',
    'Toms (count)': r.toms_count ?? '—',
    'Toms (sizes)":': Array.isArray(r.toms_sizes_in)? r.toms_sizes_in.join(', ') : (r.toms_sizes_in||'—'),
    'Crash (count)': r.crash_count ?? '—',
    'Ride zones': r.ride_zones ?? '—',
    'Kick tower': r.kick_tower ? 'Yes' : (r.kick_tower===false ? 'Pad' : '—')
  };
}
function openCompare(){
  const ids=[...state.compare];
  const items=ids.map(id=>state.byId.get(String(id))).filter(Boolean);
  const dlg=document.createElement('dialog'); dlg.className='cmp'; dlg.id='cmpDlg';
  const makeCells=(cb)=>items.map(cb).join('');
  const gallery = makeCells(r=>`<div class="cell"><div class="img"><img src="${pickImage(r)}" alt=""></div><div class="chip price">${AED(r.price)}</div><div style="margin-top:6px;font-weight:700">${r.name||''}</div></div>`);
  const specKeys=Object.keys(items.length?specOf(items[0]):{});
  const rowsHtml=specKeys.map(k=>`
    <div class="spec"><div class="label">${k}</div></div>
    ${makeCells(r=>`<div class="cell">${specOf(r)[k]}</div>`)}
  `).join('');
  dlg.innerHTML=`
    <div class="head"><h3 style="margin:0">Compare</h3><button class="x" data-close="1">Close</button></div>
    <div class="grid">
      <div class="spec"><div class="label">Product</div></div>
      ${gallery}
      ${rowsHtml}
      <div class="spec"><div class="label">Highlights</div></div>
      ${makeCells(r=>`<div class="cell">${Array.isArray(r.features)? r.features.slice(0,6).map(f=>`<div class="chip">${f}</div>`).join('') : '—'}</div>`)}
    </div>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  dlg.addEventListener('click',e=>{ if(e.target?.dataset?.close) dlg.close(); });
  dlg.addEventListener('close',()=>dlg.remove());
}

/* ---------- main render ---------- */
function updateCompareBadge(){
  const el=$('#compareCount') || $('#openCompare') || $('#btnCompare');
  if(el){
    const n=state.compare.size;
    const badge=$('#compareCount')||document.createElement('span');
    badge.id='compareCount'; badge.textContent=n;
    if(!$('#compareCount') && el.appendChild) el.appendChild(document.createTextNode(' ')), el.appendChild(badge);
  }
}
function render(){
  const grid=$('#grid'); if(!grid) return;
  const list=filteredRows();
  if(!list.length){ grid.innerHTML=`<div class="muted" style="padding:18px;border:1px dashed #2b3642;border-radius:12px">No items match this view. Try clearing filters.</div>`; return; }
  grid.innerHTML=list.map(renderCard).join('');
  $$('[data-explore]').forEach(b=>b.onclick=e=>openDetail(e.currentTarget.dataset.explore));
  $$('[data-compare]').forEach(cb=>cb.onchange=e=>{
    const id=String(e.currentTarget.dataset.compare);
    if(e.currentTarget.checked) state.compare.add(id); else state.compare.delete(id);
    updateCompareBadge();
  });
  updateCompareBadge();
}

/* ---------- header wiring ---------- */
function wireHeader(){
  $$('[data-filter]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      $$('[data-filter]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.filterLabel=btn.getAttribute('data-filter');
      render();
    });
  });

  // Hook any of these: #openCompare, #btnCompare, [data-open="compare"], or a button with text "Compare"
  const cmpBtn = $('#openCompare') || $('#btnCompare') || $('[data-open="compare"]') ||
                 Array.from(document.querySelectorAll('button')).find(b=>/^\s*compare/i.test(b.textContent||''));
  if(cmpBtn) cmpBtn.addEventListener('click', ()=>{
    if(!state.compare.size){ alert('Add items to compare first.'); return; }
    openCompare();
  });

  // Wizard
  const wiz = $('#btnWizard') || $('[data-open="wizard"]');
  if(wiz) wiz.addEventListener('click', openWizard);
}

/* ---------- wizard (unchanged look, white text) ---------- */
function openWizard(){
  const dlg = $('#wizard') || (()=>{
    const el=document.createElement('dialog'); el.id='wizard';
    el.innerHTML=`
      <div class="modal-head"><strong>Find My Perfect Kit</strong><button data-close="1" class="x">Close</button></div>
      <div class="modal-body">
        <div class="grid2" id="wizGrid"></div>
        <div class="row gap"><button id="btnRecommend" class="btn btn-primary">Get Recommendation</button><button data-close="1" class="btn btn-ghost">Close</button></div>
        <div id="wizOut" class="match-card" style="display:none"></div>
      </div>`; document.body.appendChild(el); return el; })();

  const opts=(a)=>a.map(v=>`<option>${v}</option>`).join('');
  $('#wizGrid',dlg).innerHTML=`
    <div><label>Experience</label><select id="expSel">${opts(['Beginner','Intermediate','Advanced'])}</select></div>
    <div><label>Budget</label><select id="budSel">${opts(['AED 0 – 2,000','AED 2,000 – 5,000','AED 5,000 – 10,000','AED 10,000+'])}</select></div>
    <div><label>Space</label><select id="spaceSel">${opts(['Compact','Standard','Studio'])}</select></div>
    <div><label>Goal</label><select id="goalSel">${opts(['Learning','Recording','Performance'])}</select></div>
    <div><label>Noise Sensitivity</label><select id="noiseSel">${opts(['Low','Medium','High (keep it quiet)'])}</select></div>
    <div><label>Connectivity Preference</label><select id="connSel">${opts(['USB/MIDI','Bluetooth','No preference'])}</select></div>`;
  $('#btnRecommend',dlg).onclick=()=>{
    const kits=filteredRows().filter(r=>r.category==='Drum Kits'); if(!kits.length){ $('#wizOut',dlg).style.display='none'; return; }
    const budget=$('#budSel',dlg).value; const max=budget.includes('10,000+')?9e9:Number(budget.split('–')[1].replace(/[^\d]/g,'')); const min=Number(budget.split('–')[0].replace(/[^\d]/g,''))||0;
    let best=null,score=-1; for(const r of kits){ let s=0;
      if(r.price>=min&&r.price<=max) s+=3;
      if($('#noiseSel',dlg).value.startsWith('High') && /mesh/i.test(r.name||'')) s+=1;
      if($('#connSel',dlg).value==='USB/MIDI' && (r.usb_midi||/USB/i.test(r.name||''))) s+=1;
      s+=(r.kits_factory||0)>24?1:0; if(s>score){score=s;best=r;}
    }
    if(!best){ $('#wizOut',dlg).style.display='none'; return; }
    $('#wizOut',dlg).style.display='block';
    $('#wizOut',dlg).innerHTML=`<h4>Your Match</h4><div><strong>${best.name}</strong> looks like a great fit at ${AED(best.price)}.</div><div class="muted" style="margin-top:6px">Because it matches your budget and preferences.</div><div style="margin-top:10px"><button class="btn btn-primary" data-open="${best.id}">View This Kit</button></div>`;
    $('#wizOut [data-open]',dlg).onclick=e=>{ dlg.close(); openDetail(e.currentTarget.dataset.open); };
  };
  dlg.addEventListener('click',e=>{ if(e.target?.dataset?.close) dlg.close(); });
  dlg.showModal();
}

/* ---------- boot ---------- */
window.addEventListener('DOMContentLoaded', async ()=>{ wireHeader(); await load(); });
