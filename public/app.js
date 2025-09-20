const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);
const AED=n=>`AED ${Number(n).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const PLACEHOLDER='data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><rect width="100%" height="100%" fill="#f4f6f8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,Segoe UI,Arial" font-size="22" fill="#8a97a6">Image coming soon</text></svg>`);
const CHIP_MAP={'Electronic Drum Kits':'Drum Kits','Drum Amplification':'Drum Amps','Accessories':'Accessories','Multipads & Drum Machines':'Multipads','On Demo':'__DEMO__'};
const state={rows:[],byId:new Map(),filter:'All',compare:new Set()};
const sb=window.supabase;

/* Select best image from row (prefer detail for modal, primary for card) */
function pickImage(r,kind='card'){ const direct=(kind==='detail'&&(r.detail_image_url||(Array.isArray(r.images)&&r.images[1])))||r.primary_image_url||r.image_url||(Array.isArray(r.images)?r.images[0]:null); const storage=r?.image_path?+r.image_path:null; return direct||storage||PLACEHOLDER; }

/* Normalize arrays (features/contents may be JSON or newline bullets) */
function toList(v){
  if(!v) return [];
  if(Array.isArray(v)) return v;
  if(typeof v==='string'){
    try{const j=JSON.parse(v); if(Array.isArray(j)) return j;}catch{}
    return v.split(/\r?\n/).map(s=>s.replace(/^[•-]\s*/,'').trim()).filter(Boolean);
  }
  return [];
}

/* Query + realtime */
async function load(){
  let rows=[];
  if(sb){
    const {data,error}=await sb.from('drum_kits').select('*').order('price',{ascending:true});
    if(error) console.error(error);
    rows=data||[];
  }else{
    const u=`${window.ENV.SUPABASE_URL}/rest/v1/drum_kits?select=*&order=price.asc`;
    const res=await fetch(u,{headers:{apikey:window.ENV.SUPABASE_ANON_KEY,Authorization:`Bearer ${window.ENV.SUPABASE_ANON_KEY}`}});
    rows=await res.json();
  }
  rows=rows.filter(r=>r.is_active!==false); // treat NULL as active
  state.rows=rows; state.byId=new Map(rows.map(r=>[String(r.id),r]));
  render();

  if(sb){
    sb.channel('public:drum_kits').on('postgres_changes',{event:'*',schema:'public',table:'drum_kits'},p=>{
      const id=String((p.new??p.old).id);
      if(p.eventType==='DELETE') state.byId.delete(id); else state.byId.set(id,p.new);
      state.rows=[...state.byId.values()].filter(r=>r?.is_active!==false); render();
    }).subscribe();
  }
}

/* View list by chip */
function listForView(){
  const rows=[...state.rows]; const label=state.filter;
  if(label==='All') return rows;
  if(label==='On Demo') return rows.filter(r=>r.on_demo===true);
  if(CHIP_MAP[label]==='Multipads') return rows.filter(r=>/Multi|Sample|SR-?1/i.test(r.name||''));
  const cat=CHIP_MAP[label]; return rows.filter(r=>(r.category||'').trim()===cat);
}

/* Render cards */
function render(){
  const grid=$('#grid'), empty=$('#empty');
  const list=listForView();
  $('#cmpCount').textContent=`(${state.compare.size})`;

  if(!list.length){grid.innerHTML=''; empty.style.display='block'; return;}
  empty.style.display='none';

  grid.innerHTML=list.map(r=>{
    const img=pickImage(r,'card');
    const demo=r.on_demo?`<div class="demo">${r.on_demo_label||'On Demo'}</div>`:'';
    const usb=r.usb_midi?'USB/MIDI':'';
    const bt=r.bluetooth_audio?'Bluetooth':'';
    const mesh=/(mesh)/i.test(`${r.name} ${r.description||''}`)?'Mesh':'';
    const tags=[mesh,usb,bt].filter(Boolean).map(t=>`<span class="tag">${t}</span>`).join('');
    return `
    <div class="card">
      <div class="imgbox">${demo}<img src="${img}" alt=""></div>
      <div class="content">
        <div class="price">${AED(r.price)}</div>
        <div class="title">${r.name||''}</div>
        ${r.subtitle?`<div class="subtitle">${r.subtitle}</div>`:''}
        ${r.upc?`<div class="upc">UPC: ${r.upc}</div>`:''}
        <div class="tags">${tags}</div>
        <div class="row">
          <button class="btn btn-ghost" data-explore="${r.id}">Explore</button>
          <label class="compare"><input type="checkbox" data-compare="${r.id}" ${state.compare.has(String(r.id))?'checked':''}/> Add to compare</label>
        </div>
      </div>
    </div>`;
  }).join('');

  $$('[data-explore]').forEach(b=>b.onclick=()=>openDetail(b.dataset.explore));
  $$('[data-compare]').forEach(cb=>cb.onchange=()=>{const id=String(cb.dataset.compare); cb.checked?state.compare.add(id):state.compare.delete(id); $('#cmpCount').textContent=`(${state.compare.size})`;});
}

/* Detail modal (2-column, clean) */
function openDetail(id){
  const r=state.byId.get(String(id)); if(!r) return;
  $('#dTitle').textContent=r.name||'';
  $('#dImg').src=pickImage(r,'detail');
  $('#dPrice').textContent=AED(r.price);
  $('#dUpc').textContent=r.upc?`UPC: ${r.upc}`:'';
  $('#dUpc').style.display=r.upc?'inline-block':'none';
  $('#dDemo').textContent=r.on_demo? (r.on_demo_label||'On Demo') : '';
  $('#dDemo').style.display=r.on_demo?'inline-block':'none';

  const feats=toList(r.features), incl=toList(r.contents);
  const desc=(r.description||'').trim();

  $('#dDescSec').style.display=desc?'block':'none'; $('#dDesc').textContent=desc;
  $('#dFeatSec').style.display=feats.length?'block':'none'; $('#dFeat').innerHTML=feats.map(x=>`<li>${x}</li>`).join('');
  $('#dInclSec').style.display=incl.length?'block':'none'; $('#dIncl').innerHTML=incl.map(x=>`<li>${x}</li>`).join('');

  const usb=r.usb_midi?'USB/MIDI':''; const bt=r.bluetooth_audio?'Bluetooth':''; const mesh=/(mesh)/i.test(`${r.name} ${r.description||''}`)?'Mesh':'';
  $('#dTopTags').innerHTML=[mesh,usb,bt].filter(Boolean).map(t=>`<span class="tag">${t}</span>`).join('');

  $('#detailDlg').showModal();
}

/* Compare modal */
function showCompare(){
  const ids=[...state.compare]; const rows=ids.map(id=>state.byId.get(String(id))).filter(Boolean);
  const el=$('#compareGrid'); el.innerHTML = rows.length? rows.map(r=>{
    return `<div class="card" style="overflow:hidden">
      <div class="imgbox"><img src="${pickImage(r,'card')}" alt=""></div>
      <div class="content">
        <div class="title">${r.name||''}</div>
        <div class="price">${AED(r.price)}</div>
        <div class="hr"></div>
        <div class="muted">Category: ${r.category||''}</div>
        <div class="muted">USB/MIDI: ${r.usb_midi? 'Yes':'No'}</div>
        <div class="muted">Bluetooth: ${r.bluetooth_audio? 'Yes':'No'}</div>
        <button class="btn btn-ghost" data-explore="${r.id}" style="margin-top:8px">View</button>
      </div>
    </div>`;
  }).join('') : `<div class="muted" style="grid-column:1/-1;border:1px dashed var(--line);padding:16px;border-radius:12px">Nothing to compare yet. Tick “Add to compare” on any card.</div>`;
  $('#compareDlg').showModal();
  el.querySelectorAll('[data-explore]').forEach(b=>b.onclick=()=>{openDetail(b.dataset.explore); $('#compareDlg').close();});
}

/* Wizard */
function showWizard(){ $('#wizDlg').showModal(); }
function scoreAndSuggest(){
  const [min,max]=($('#wBudget').value).split('-').map(Number);
  let pool=state.rows.filter(r=>(r.category||'')==='Drum Kits' && r.price>=min && r.price<=max);
  const wantUSB=$('#wConn').value==='USB/MIDI', wantBT=$('#wConn').value==='Bluetooth';
  if(wantUSB) pool=pool.filter(r=>r.usb_midi);
  if(wantBT) pool=pool.filter(r=>r.bluetooth_audio);
  if(!pool.length) { $('#wOut').innerHTML='<div class="muted" style="border:1px dashed var(--line);padding:12px;border-radius:12px">No matches for those answers.</div>'; return; }
  pool.sort((a,b)=>a.price-b.price);
  const r=pool[0];
  $('#wOut').innerHTML=`
    <div class="sheet" style="background:var(--card);border-radius:12px">
      <div style="font-weight:800;color:#9ef5ff;margin-bottom:4px">Your Match</div>
      <div style="margin-bottom:8px"><strong>${r.name}</strong> looks like a great fit at <strong>${AED(r.price)}</strong>.</div>
      <button class="btn btn-primary" data-explore="${r.id}">View This Kit</button>
    </div>`;
  $('#wOut').querySelector('[data-explore]').onclick=()=>{openDetail(r.id); $('#wizDlg').close();};
}

/* Events */
$('#chips').addEventListener('click',e=>{
  const b=e.target.closest('.chip'); if(!b) return;
  $$('#chips .chip').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  state.filter=b.dataset.filter; render();
});
$('#btnFind').onclick=showWizard;
$('#btnCompare').onclick=showCompare;
$$('dialog [data-close]').forEach(x=>x.onclick=()=>x.closest('dialog').close());
$('#wGo').onclick=scoreAndSuggest;

/* Boot */
load();
