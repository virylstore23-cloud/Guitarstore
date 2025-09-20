/* global window, document */
const SB_URL = window.ENV?.SUPABASE_URL;
const SB_KEY = window.ENV?.SUPABASE_ANON_KEY;

if (!window.supabase) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  window.supabase = createClient(SB_URL, SB_KEY);
}
const supabase = window.supabase;

const AED = (v)=> `AED ${Number(v||0).toLocaleString('en-AE',{minimumFractionDigits:2, maximumFractionDigits:2})}`;
const PLACEHOLDER = `data:image/svg+xml;utf8,`+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'><rect width='800' height='450' fill='#0f172a'/><text x='50%' y='52%' fill='#00c8ff' font-family='Arial Black,Arial' font-size='64' text-anchor='middle'>ALESIS</text></svg>`);
const fixUrl = u => !u ? null : (/^https?:\/\//i.test(u)?u:`https://${String(u).replace(/^\/+/, '')}`);

const mapToTop = (r)=>{
  if (r.category==='Drum Amps') return 'Drum Amplification';
  if (r.category==='Drum Kits') return 'Electronic Drum Kits';
  const s=(r.slug||'').toLowerCase(), n=(r.name||'').toLowerCase();
  if (/(samplepad|strike.*multipad|^sr-?1[68]\b)/.test(s+n)) return 'Multipads & Drum Machines';
  return 'Accessories';
};

const state={rows:[],byId:new Map(),filterLabel:'All',compare:new Set()};
const CHIP_TO_TEST={
  'All':()=>true,
  'Electronic Drum Kits':r=>mapToTop(r)==='Electronic Drum Kits',
  'Multipads & Drum Machines':r=>mapToTop(r)==='Multipads & Drum Machines',
  'Drum Amplification':r=>mapToTop(r)==='Drum Amplification',
  'Accessories':r=>mapToTop(r)==='Accessories',
  'On Demo':r=>!!r.on_demo,
};

async function load(){
  const {data,error}=await supabase.from('drum_kits').select('*').eq('is_active',true).order('price',{ascending:true});
  if(error){console.error(error);return;}
  state.byId.clear(); data.forEach(r=>state.byId.set(String(r.id),r));
  state.rows=data; render();
}

const grid=document.getElementById('kitGrid');
function render(){
  const test = CHIP_TO_TEST[state.filterLabel] || CHIP_TO_TEST['All'];
  const rows = state.rows.filter(test);
  grid.innerHTML = rows.map(cardHTML).join('');
  grid.querySelectorAll('[data-explore]').forEach(b=>b.addEventListener('click',e=>openDetail(e.currentTarget.dataset.explore)));
  grid.querySelectorAll('input[data-compare]').forEach(cb=>{
    cb.checked = state.compare.has(cb.dataset.compare);
    cb.addEventListener('change',e=>{
      const id=e.currentTarget.dataset.compare;
      if(e.currentTarget.checked) state.compare.add(id); else state.compare.delete(id);
      updateCompareBadge();
    });
  });
  document.querySelectorAll('[data-filter]').forEach(ch=>ch.classList.toggle('active', ch.getAttribute('data-filter')===state.filterLabel));
  updateCompareBadge();
}

function cardHTML(r){
  const img1 = fixUrl(r.primary_image_url)||fixUrl(r.detail_image_url)||PLACEHOLDER;
  const topcat = mapToTop(r);
  const demo = r.on_demo ? `<span class="badge">${r.on_demo_label || 'On demo'}</span>` : '';
  const checked = state.compare.has(String(r.id))?'checked':'';
  return `
  <article class="card">
    <div class="imgbox">
      <img src="${img1}" alt="${r.name||''}" onerror="this.onerror=null;this.src='${fixUrl(r.detail_image_url)||PLACEHOLDER}'">
      ${demo}
      <label class="badge compare"><input type="checkbox" data-compare="${r.id}" style="accent-color:#00c8ff;vertical-align:-1px" ${checked}> Compare</label>
    </div>
    <div class="content">
      <div class="slug">${r.slug||''}</div>
      <div class="title">${r.name||''}</div>
      ${r.description?`<p class="desc">${r.description}</p>`:''}
      <div class="price">${AED(r.price)}</div>
      <div class="pill">${topcat}</div>
      <div style="margin-top:10px"><button class="btn btn-ghost" data-explore="${r.id}">Explore</button></div>
    </div>
  </article>`;
}

/* Detail drawer */
const detailWrap=document.getElementById('detailWrap');
const detailImg=document.getElementById('detailImg');
const detailName=document.getElementById('detailName');
const detailDesc=document.getElementById('detailDesc');
const detailPrice=document.getElementById('detailPrice');
const detailBadges=document.getElementById('detailBadges');
const addCompareBtn=document.getElementById('addCompare');

function openDetail(id){
  const r=state.byId.get(String(id)); if(!r) return;
  detailName.textContent=r.name||''; detailDesc.textContent=r.description||''; detailPrice.textContent=AED(r.price);
  detailBadges.innerHTML=`<span class="pill">${mapToTop(r)}</span>${r.on_demo?` <span class="pill">${r.on_demo_label||'On demo'}</span>`:''}`;
  detailImg.src=fixUrl(r.detail_image_url)||fixUrl(r.primary_image_url)||PLACEHOLDER; detailImg.alt=r.name||'';
  addCompareBtn.onclick=()=>{state.compare.add(String(id)); updateCompareBadge();};
  detailWrap.classList.add('open'); detailWrap.setAttribute('aria-hidden','false');
}
function closeDetail(){detailWrap.classList.remove('open'); detailWrap.setAttribute('aria-hidden','true');}
detailWrap.addEventListener('click',e=>{ if(e.target?.dataset?.close || e.target===detailWrap) closeDetail(); });

/* Compare */
const compareBtn=document.getElementById('compareBtn');
const compareCount=document.getElementById('compareCount');
const compareModal=document.getElementById('compareModal');
const compareGrid=document.getElementById('compareGrid');

function updateCompareBadge(){ const n=state.compare.size; if(n>0){compareCount.textContent=n; compareCount.classList.remove('sr-only');} else compareCount.classList.add('sr-only'); }
compareBtn.addEventListener('click',()=>{
  compareGrid.innerHTML=[...state.compare].map(id=>{
    const r=state.byId.get(String(id)); if(!r) return '';
    const img=fixUrl(r.primary_image_url)||PLACEHOLDER;
    return `<div class="card"><div class="imgbox"><img src="${img}" alt=""></div><div class="content"><div class="title">${r.name}</div><div class="price">${AED(r.price)}</div></div></div>`;
  }).join('') || '<div class="desc">Nothing selected yet.</div>';
  compareModal.showModal();
});
compareModal.addEventListener('click',e=>{ if(e.target?.dataset?.close) compareModal.close(); });

/* Wizard */
const wizard=document.getElementById('wizard');
document.getElementById('btnWizard').addEventListener('click',()=>{ buildWizard(); wizard.showModal(); });
wizard.addEventListener('click',e=>{ if(e.target?.dataset?.close) wizard.close(); });

function buildWizard(){
  const body=document.getElementById('wizardBody');
  body.innerHTML=`
    <div>
      <div class="title">Level</div>
      <div class="chips"><button class="chip" data-a="lvl:beginner">Beginner</button><button class="chip" data-a="lvl:hobbyist">Hobbyist</button><button class="chip" data-a="lvl:performer">Performer</button></div>
      <div class="title" style="margin-top:10px">Bluetooth audio?</div>
      <div class="chips"><button class="chip" data-a="bt:yes">Yes</button><button class="chip" data-a="bt:no">No</button></div>
      <div class="title" style="margin-top:10px">Budget (AED)</div>
      <div class="chips"><button class="chip" data-a="b:0-1500">0–1,500</button><button class="chip" data-a="b:1500-4000">1,500–4,000</button><button class="chip" data-a="b:4000+">4,000+</button></div>
      <div style="margin-top:14px"><button id="btnSuggest" class="btn btn-alesis">Suggest kits</button></div>
    </div>
    <div><div class="sub">We’ll cross-match price, I/O, and pad layout to shortlist kits.</div></div>
  `;
  const picks=new Set();
  body.querySelectorAll('[data-a]').forEach(b=>b.addEventListener('click',()=>{const k=b.getAttribute('data-a'); if(b.classList.toggle('active')) picks.add(k); else picks.delete(k);} ));
  body.querySelector('#btnSuggest').addEventListener('click',()=>{
    const wantBt=picks.has('bt:yes');
    const budget=[...picks].find(x=>x.startsWith('b:'))||'b:0-999999'; const [min,maxRaw]=budget.slice(2).split('-'); const max=maxRaw?.endsWith('+')?999999:Number(maxRaw)||999999; const minN=Number(min)||0;
    const out=document.getElementById('wizOut');
    const cands=state.rows.filter(r=>mapToTop(r)==='Electronic Drum Kits').filter(r=>(r.price||0)>=minN&&(r.price||0)<=max).filter(r=>wantBt?!!r.bluetooth_audio:true).slice(0,4);
    out.innerHTML=cands.map(r=>{const img=fixUrl(r.primary_image_url)||PLACEHOLDER;return `<div class="card"><div class="imgbox"><img src="${img}" alt=""></div><div class="content"><div class="title">${r.name}</div><div class="price">${AED(r.price)}</div><button class="btn btn-ghost" data-explore="${r.id}">Explore</button></div></div>`}).join('')||'<div class="desc">No matches for those answers.</div>';
    out.querySelectorAll('[data-explore]').forEach(b=>b.addEventListener('click',e=>{openDetail(e.currentTarget.dataset.explore); wizard.close();}));
  });
}

/* Filters */
document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{state.filterLabel=btn.getAttribute('data-filter'); render();}));

/* Boot + realtime */
await load();
supabase.channel('public:drum_kits')
  .on('postgres_changes',{event:'*',schema:'public',table:'drum_kits'},p=>{
    const id=String((p.new??p.old).id);
    if(p.eventType==='DELETE') state.byId.delete(id); else state.byId.set(id,p.new);
    state.rows=[...state.byId.values()].filter(r=>r?.is_active); render();
  }).subscribe();
