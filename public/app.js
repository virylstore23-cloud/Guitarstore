// app.js — title in sticky bar (no logo), hide back title, smarter descriptions, images cover

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const money = n => (n==null ? '—' : 'AED ' + Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));

// Card images should FILL boxes. Detail modal should SHOW WHOLE image.
(function injectCSS(){
  const css = `
    .img-frame{position:relative;overflow:hidden;border-radius:12px;background:#111}
    .img-16x10{aspect-ratio:16/10}
    .img-cover{width:100%;height:100%;object-fit:cover;display:block}
    .img-contain{width:100%;height:100%;object-fit:contain;display:block;background:#000}
    /* slightly larger chips */
    .chip{font-size:.8rem;padding:.22rem .6rem;border-radius:.5rem;border:1px solid #334155;color:#cbd5e1;background:#111827aa}
  `;
  const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);
})();

const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#111"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ddd" font-family="Arial" font-size="18">Image coming soon</text></svg>`
);

const state = { kits: [], byId:new Map(), selected:new Set(), activeFilter:'all' };

// ---------- helpers ----------
const safeJSON = (s,fallback=[]) => { try{ return JSON.parse(s) } catch{ return fallback } };
const asArr = v => Array.isArray(v) ? v : (typeof v==='string' && v.trim().startsWith('[') ? safeJSON(v,[]) : []);
const pieceCount = t => { const m=String(t||'').match(/(\d+)\s*[- ]?\s*piece/i); return m?Number(m[1]):null; };

function traitsOf(k){
  const blob=[k.name,k.description,(k.features||[]).join(' '),(k.contents||[]).join(' ')].join(' ').toLowerCase();
  // classify: amp/speaker vs drum kit
  const isAmp = /(amp|amplifier|monitor|speaker)\b/.test(blob);
  return {
    category: isAmp ? 'amp' : 'kit',
    pieces: pieceCount(blob)||pieceCount(k.name)||(pieceCount((k.features||[]).join(' '))||null),
    mesh:/mesh/.test(blob), usb:/(usb|midi)/.test(blob), bluetooth:/bluetooth/.test(blob),
    dual:/dual[- ]?zone/.test(blob), triple:/triple[- ]?zone/.test(blob),
    touch:/touch[- ]?screen/.test(blob), pro:/(professional|advanced|prime|club)/.test(blob),
    starter:/(starter|beginner|debut|easy)/.test(blob), recording:/(record|daw)/.test(blob),
    learning:/(learn|lesson|metronome|coach)/.test(blob), performing:/(stage|perform|gig|live)/.test(blob)
  };
}

function norm(raw){
  const features=asArr(raw.features||[]), contents=asArr(raw.contents||[]);
  const k={
    id:String(raw.id), name:raw.name||'Unnamed', slug:raw.slug||'', description:raw.description||'',
    price:(raw.price==null||isNaN(Number(raw.price)))?null:Number(raw.price),
    upc:raw.upc_code||'—', is_active:(raw.is_active!==false),
    on_demo:!!raw.on_demo, on_demo_label:raw.on_demo_label||'On demo',
    image:raw.primary_image_url||raw.detail_image_url||PLACEHOLDER,
    detail_image:raw.detail_image_url||raw.primary_image_url||PLACEHOLDER,
    video:raw.video_url||null, features, contents
  };
  k.traits = traitsOf(k);
  return k;
}

// Smart fallback descriptions
function autoDesc(k){
  if(k.traits.category==='amp'){
    const conn = [k.traits.bluetooth?'Bluetooth':null, k.traits.usb?'USB/MIDI':null].filter(Boolean).join(' + ');
    const end = k.price?` at ${money(k.price)}`:'';
    return `drum amplifier for electronic kits${conn?` with ${conn}`:''} — great for practice${end}.`;
  }
  // drum kit default
  const bits=[];
  const pcs=k.traits.pieces || null;
  const zones = k.traits.triple ? 'triple-zone' : (k.traits.dual ? 'dual-zone' : null);
  const conn = [k.traits.bluetooth?'Bluetooth':null, k.traits.usb?'USB/MIDI':null].filter(Boolean).join(' + ');
  if(pcs) bits.push(`${pcs}-piece`);
  bits.push(k.traits.mesh?'mesh electronic drum kit':'electronic drum kit');
  if(zones) bits.push(`with ${zones} pads`);
  if(conn) bits.push(`and ${conn}`);
  const aim = k.traits.performing ? 'performing' : (k.traits.recording ? 'recording' : (k.traits.learning ? 'learning' : 'practice'));
  const tail = ` — great for ${aim}${k.price?` at ${money(k.price)}`:''}.`;
  return (bits.join(' ') + tail).replace(/\s+/g,' ').trim();
}
const getDesc = k => (k.description && k.description.trim()) ? k.description : autoDesc(k);

// ---------- data ----------
async function loadKits(){
  const r = await fetch('/api/kits',{cache:'no-store'});
  if(!r.ok) throw new Error('API '+r.status);
  const j = await r.json();
  const raw = Array.isArray(j?.kits) ? j.kits : (Array.isArray(j)?j:[]);
  state.kits = (raw||[]).map(norm);
  state.byId = new Map(state.kits.map(k=>[k.id,k]));
}

// ---------- UI ----------
function render(){
  const grid = $('#kitGrid');
  grid.innerHTML = '';
  const list = state.kits.filter(k=>k.is_active).filter(k=> state.activeFilter==='demo' ? k.on_demo : true);
  if(!list.length){
    grid.innerHTML = `<div class="col-span-full text-center text-zinc-400">No kits found.</div>`;
    updateCompareShelf(); updateActionBar(); return;
  }
  list.forEach(k => grid.appendChild(renderCard(k)));
  updateCompareShelf(); updateActionBar();
}

function renderCard(k){
  const el = document.createElement('article');
  el.className = 'kit-card bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 flex flex-col gap-2 shadow';
  el.setAttribute('data-id', k.id);
  el.innerHTML = `
    <figure class="img-frame img-16x10 border border-zinc-700 cursor-pointer">
      <img src="${k.image}" alt="${k.name}" class="img-cover" loading="lazy"
           onerror="this.onerror=null;this.src='${PLACEHOLDER}'" />
      ${k.on_demo?`<div class="absolute top-2 left-2 chip bg-emerald-600/90 text-white border-emerald-600">${k.on_demo_label}</div>`:''}
    </figure>
    <div class="flex-1">
      <h3 class="text-base font-semibold leading-tight cursor-pointer">${k.name}</h3>
      <p class="text-sm text-zinc-300 line-clamp-2">${getDesc(k)}</p>
      <div class="mt-1 text-sm text-zinc-200">Price: ${money(k.price)}</div>
      <div class="text-xs text-zinc-400">UPC: ${k.upc}</div>
      <div class="mt-1 flex flex-wrap gap-1">
        ${k.traits.category==='amp'?`<span class="chip">Drum Amp</span>`:''}
        ${k.traits.mesh?`<span class="chip">Mesh</span>`:''}
        ${k.traits.dual?`<span class="chip">Dual-zone</span>`:''}
        ${k.traits.triple?`<span class="chip">Triple-zone</span>`:''}
        ${k.traits.usb?`<span class="chip">USB/MIDI</span>`:''}
        ${k.traits.bluetooth?`<span class="chip">Bluetooth</span>`:''}
      </div>
    </div>
    <div class="mt-2 flex items-center justify-between">
      <button class="text-sm border border-zinc-600 px-3 py-1 rounded-lg hover:bg-zinc-700" data-action="open">Explore</button>
      <label class="text-xs flex items-center gap-2 select-none">
        <input type="checkbox" data-sel="${k.id}" ${state.selected.has(k.id)?'checked':''} />
        Add to compare
      </label>
    </div>
  `;
  el.querySelector('[data-action="open"]').addEventListener('click', () => openDetail(k.id));
  el.querySelector('figure').addEventListener('click', () => openDetail(k.id));
  el.querySelector('h3').addEventListener('click', () => openDetail(k.id));
  el.querySelector('input[type="checkbox"][data-sel]').addEventListener('change', (e)=>{
    e.target.checked ? state.selected.add(k.id) : state.selected.delete(k.id);
    updateCompareShelf(); updateActionBar();
  });
  return el;
}

// Sticky action bar: text only, centered; remove back title/note
function ensureActionBar(){
  let bar = $('#actionBar'); if(bar) return bar;
  bar = document.createElement('div');
  bar.id='actionBar';
  bar.className='fixed top-0 inset-x-0 z-40';
  bar.innerHTML = `
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mt-2 mb-2 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-xl p-2 shadow">
        <div class="flex items-center justify-between gap-2">
          <div class="flex-1"></div>
          <div class="text-center">
            <div class="text-sm sm:text-base font-extrabold tracking-tight">Alesis Soundstage</div>
          </div>
          <div class="flex items-center gap-2">
            <button id="btnFind" class="text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 border border-red-600">Find My Kit</button>
            <button id="btnCompare" class="text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg border border-zinc-600 hover:bg-zinc-800 disabled:opacity-50" disabled>Compare (0)</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(bar);
  $('#btnFind').addEventListener('click', openFinder);
  $('#btnCompare').addEventListener('click', ()=> state.selected.size>=2 && openCompare());
  return bar;
}
function updateActionBar(){
  const btn = $('#btnCompare') || ensureActionBar();
  const n = state.selected.size;
  btn.textContent = `Compare (${n})`;
  btn.disabled = n<2;
}

function updateCompareShelf(){
  const shelf = $('#compareShelf > div');
  const count = $('#compareCount');
  if(!shelf || !count) return;
  const n = state.selected.size;
  count.textContent = String(n);
  shelf.classList.toggle('hidden', n<=0);
}

// Detail modal (image = contain)
function ensureDetailModal(){
  if($('#detailModal')) return $('#detailModal');
  const wrap = document.createElement('div');
  wrap.id = 'detailModal';
  wrap.className = 'fixed inset-0 hidden items-center justify-center z-50';
  wrap.innerHTML = `
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div role="dialog" aria-modal="true" class="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl w-[min(960px,92vw)] max-h-[90vh] overflow-auto">
      <div class="flex items-center justify-between border-b border-zinc-700 p-3">
        <h2 id="detailTitle" class="text-lg font-bold">Kit details</h2>
        <button id="detailClose" class="border border-zinc-600 rounded-lg px-3 py-1 hover:bg-zinc-800">Close</button>
      </div>
      <div class="p-4">
        <div class="grid md:grid-cols-2 gap-4">
          <div class="img-frame img-16x10 border border-zinc-700">
            <img id="detailImage" class="img-contain" alt="" />
          </div>
          <div>
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <span id="detailPrice" class="inline-block bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold"></span>
              <span id="detailUPC" class="chip"></span>
              <span id="detailDemo" class="chip"></span>
            </div>
            <div class="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3">
              <h3 class="font-semibold text-red-300">Description</h3>
              <p id="detailDesc" class="text-zinc-200 mt-1 text-sm"></p>
            </div>
            <div class="grid md:grid-cols-2 gap-3 mt-3">
              <div class="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3">
                <h3 class="font-semibold text-red-300">Key Features</h3>
                <ul id="detailFeatures" class="list-disc ml-5 mt-1 space-y-1 text-zinc-200 text-sm"></ul>
              </div>
              <div class="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3">
                <h3 class="font-semibold text-red-300">What's Included</h3>
                <ul id="detailContents" class="list-disc ml-5 mt-1 space-y-1 text-zinc-200 text-sm"></ul>
              </div>
            </div>
            <video id="detailVideo" controls playsinline class="hidden w-full mt-3 rounded-lg border border-zinc-700"></video>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', (e)=>{ if(e.target===wrap || e.target.id==='detailClose') closeModal(wrap); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(wrap); });
  return wrap;
}
function openDetail(id){
  const k = state.byId.get(String(id)); if(!k) return;
  const modal = ensureDetailModal();
  $('#detailTitle', modal).textContent = k.name;
  const img = $('#detailImage', modal); img.src = k.detail_image; img.alt = k.name;
  $('#detailPrice', modal).textContent = money(k.price);
  $('#detailUPC', modal).textContent   = k.upc ? `UPC: ${k.upc}` : 'UPC: —';
  $('#detailDemo', modal).textContent  = k.on_demo ? (k.on_demo_label || 'On demo') : '';
  $('#detailDesc', modal).textContent  = getDesc(k);

  const f = $('#detailFeatures', modal); f.innerHTML='';
  (k.features.length?k.features:['Details coming soon']).forEach(x=>{ const li=document.createElement('li'); li.textContent=x; f.appendChild(li); });

  const c = $('#detailContents', modal); c.innerHTML='';
  (k.contents.length?k.contents:[]).forEach(x=>{ const li=document.createElement('li'); li.textContent=x; c.appendChild(li); });

  const v = $('#detailVideo', modal);
  if(k.video){ v.src=k.video; v.classList.remove('hidden'); } else { v.removeAttribute('src'); v.classList.add('hidden'); }

  modal.classList.remove('hidden'); modal.classList.add('flex');
}
function closeModal(m){ m.classList.remove('flex'); m.classList.add('hidden'); }

// Compare & Finder (unchanged from your working version) ---------------------
function ensureCompareModal(){
  let m = $('#compareModal'); if(m) return m;
  m = document.createElement('div');
  m.id='compareModal';
  m.className='fixed inset-0 hidden items-center justify-center z-50';
  m.innerHTML = `
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div role="dialog" aria-modal="true" class="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl w-[min(1100px,96vw)] max-h-[92vh] overflow-auto">
      <div class="flex items-center justify-between border-b border-zinc-700 p-3">
        <h2 class="text-lg font-bold">Compare Kits</h2>
        <button id="compareClose" class="border border-zinc-600 rounded-lg px-3 py-1 hover:bg-zinc-800">Close</button>
      </div>
      <div class="p-4 space-y-4">
        <div id="compareSummary" class="text-sm text-zinc-100"></div>
        <div id="compareTable" class="overflow-auto"></div>
        <div id="compareWhy" class="text-sm text-zinc-200"></div>
        <div id="compareReco" class="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-100"></div>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  m.addEventListener('click', (e)=>{ if(e.target===m || e.target.id==='compareClose') closeModal(m); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(m); });
  return m;
}
const valueHeadline = (base, up) => {
  const d = (base.price!=null && up.price!=null) ? (up.price - base.price) : null;
  if(d==null) return `${up.name} offers more at a similar price.`;
  if(d<=0) return `${up.name} matches/undercuts ${base.name} while adding features.`;
  return `For ${money(d)} more, ${up.name} adds:`;
};
const bulletDiffs = (a,b) => {
  const aF=new Set((a.features||[]).map(x=>String(x).toLowerCase()));
  const bF=new Set((b.features||[]).map(x=>String(x).toLowerCase()));
  const extra=[...bF].filter(x=>!aF.has(x)).slice(0,6);
  const morePieces=(b.traits.pieces||0)-(a.traits.pieces||0);
  const zone = b.traits.triple&&!a.traits.triple ? 'triple-zone cymbals' : (b.traits.dual&&!a.traits.dual ? 'dual-zone pads' : null);
  const touch=!a.traits.touch&&b.traits.touch ? 'touchscreen module' : null;
  const bt=!a.traits.bluetooth&&b.traits.bluetooth ? 'Bluetooth' : null;
  const usb=!a.traits.usb&&b.traits.usb ? 'USB/MIDI I/O' : null;
  const list=[]; if(morePieces>0) list.push(`+${morePieces} piece(s)`); if(zone) list.push(zone); if(touch) list.push(touch); if(bt) list.push(bt); if(usb) list.push(usb);
  if(extra.length) list.push('extras: '+extra.join(', '));
  return list.length?list:['richer feature set'];
};
function openCompare(){
  const m = ensureCompareModal();
  const items=[...state.selected].map(id=>state.byId.get(id)).filter(Boolean);
  if(items.length<2){ return; }
  const rows=items.slice(0,4);
  const priced=rows.filter(r=>r.price!=null).sort((a,b)=>a.price-b.price);
  const base=priced[0]||rows[0]; const rest=rows.filter(r=>r.id!==base.id);

  let html=`<div class="min-w-[860px]"><table class="w-full text-sm border-separate border-spacing-0">
    <thead><tr>
      <th class="text-left p-2 border-b border-zinc-700">Spec</th>
      ${rows.map(k=>`<th class="text-left p-2 border-b border-zinc-700">${k.name}<div class="text-xs text-zinc-400 mt-1">${money(k.price)}</div></th>`).join('')}
    </tr></thead><tbody>`;
  const line = (label, fn) => `<tr>
    <td class="p-2 border-b border-zinc-800 text-zinc-300">${label}</td>
    ${rows.map(k=>`<td class="p-2 border-b border-zinc-800">${fn(k)}</td>`).join('')}
  </tr>`;
  html += line('Pieces (est.)', k=> (k.traits.category==='amp'?'—':(k.traits.pieces||'—')));
  html += line('Mesh Heads',   k=> k.traits.category==='amp'?'—':(k.traits.mesh?'Yes':'—'));
  html += line('Zones',        k=> k.traits.category==='amp'?'—':(k.traits.triple?'Triple':(k.traits.dual?'Dual':'—')));
  html += line('Connectivity', k=> [(k.traits.bluetooth?'BT':null),(k.traits.usb?'USB/MIDI':null)].filter(Boolean).join(' + ') || '—');
  html += line('Learn/Record', k=> [(k.traits.learning?'Learning':null),(k.traits.recording?'Recording':null)].filter(Boolean).join(' + ') || '—');
  html += line('Feature Count',k=> (k.features||[]).length);
  html += `</tbody></table></div>`;
  $('#compareTable', m).innerHTML = html;

  $('#compareSummary', m).innerHTML = `<p><span class="inline-block text-[11px] px-2 py-[2px] rounded bg-zinc-800 border border-zinc-700 mr-2">Baseline</span>Start with <b>${base.name}</b> (${money(base.price)}). Moving up adds:</p>`;

  let why = '<ol class="list-decimal ml-5 space-y-2">';
  rest.sort((a,b)=> (a.price??Infinity) - (b.price??Infinity)).forEach(k=>{
    const b=bulletDiffs(base,k);
    const d=(base.price!=null&&k.price!=null)?(k.price-base.price):null;
    const pct=(d!=null&&base.price>0)?Math.round(d/base.price*100):null;
    why += `<li><b>${k.name}</b> — <i>${valueHeadline(base,k)}</i> ${b.slice(0,4).join('; ')}${d!=null?` <span class="inline-block text-[11px] px-2 py-[2px] rounded bg-zinc-800 border border-zinc-700">+${money(d)}${pct!=null?` (${pct}%)`:''}</span>`:''}</li>`;
  });
  why += '</ol>';
  $('#compareWhy', m).innerHTML = why;

  const ladder = [...rows].sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
  const tier = (i) => ['Good','Better','Best','Elite'][i]||'Option';
  const reco = ladder.map((k,i)=>{
    const tags = [
      k.traits.category==='amp'?'Amp':'',
      k.traits.mesh && k.traits.category!=='amp'?'Mesh':'',
      k.traits.triple && k.traits.category!=='amp'?'Triple-zone':(k.traits.dual && k.traits.category!=='amp'?'Dual-zone':''),
      k.traits.bluetooth?'BT':'',
      k.traits.usb?'USB/MIDI':''
    ].filter(Boolean).map(t=>`<span class="inline-block text-[11px] px-2 py-[2px] rounded bg-zinc-800 border border-zinc-700 mr-1">${t}</span>`).join(' ');
    return `<div class="mb-1"><b>${tier(i)}:</b> ${k.name} — ${money(k.price)} ${tags}</div>`;
  }).join('');
  $('#compareReco', m).innerHTML = `<h4 class="font-semibold text-emerald-300 mb-2">Recommendation Ladder</h4>${reco}`;

  m.classList.remove('hidden'); m.classList.add('flex');
}

// Finder (unchanged scoring)
function ensureFinderModal(){
  let m = $('#finderModal'); if(m) return m;
  m = document.createElement('div');
  m.id='finderModal';
  m.className='fixed inset-0 hidden items-center justify-center z-50';
  m.innerHTML = `
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
    <div role="dialog" aria-modal="true" class="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl w-[min(820px,94vw)] max-h-[92vh] overflow-auto">
      <div class="flex items-center justify-between border-b border-zinc-700 p-3">
        <h2 class="text-lg font-bold">Find My Perfect Kit</h2>
        <button id="finderClose" class="border border-zinc-600 rounded-lg px-3 py-1 hover:bg-zinc-800">Close</button>
      </div>
      <div class="p-4">
        <form id="finderForm" class="grid md:grid-cols-2 gap-3">
          <label class="text-sm text-zinc-300">Experience
            <select name="exp" class="w-full mt-1 bg-zinc-800 rounded-lg p-2 border border-zinc-700">
              <option value="beginner">Beginner</option>
              <option value="intermediate" selected>Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label class="text-sm text-zinc-300">Budget
            <select name="budget" class="w-full mt-1 bg-zinc-800 rounded-lg p-2 border border-zinc-700">
              <option value="under2">Under AED 2,000</option>
              <option value="2to5" selected>AED 2,000 – 5,000</option>
              <option value="over5">AED 5,000+</option>
            </select>
          </label>
          <label class="text-sm text-zinc-300">Space
            <select name="space" class="w-full mt-1 bg-zinc-800 rounded-lg p-2 border border-zinc-700">
              <option value="compact" selected>Compact</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>
          <label class="text-sm text-zinc-300">Goal
            <select name="goal" class="w-full mt-1 bg-zinc-800 rounded-lg p-2 border border-zinc-700">
              <option value="learning" selected>Learning</option>
              <option value="recording">Recording</option>
              <option value="performing">Performing</option>
            </select>
          </label>
          <label class="text-sm text-zinc-300">Noise Sensitivity
            <select name="noise" class="w-full mt-1 bg-zinc-800 rounded-lg p-2 border border-zinc-700">
              <option value="high" selected>High (keep it quiet)</option>
              <option value="medium">Medium</option>
              <option value="low">Low (not a problem)</option>
            </select>
          </label>
          <label class="text-sm text-zinc-300">Connectivity Preference
            <select name="conn" class="w-full mt-1 bg-zinc-800 rounded-lg p-2 border border-zinc-700">
              <option value="usb" selected>USB/MIDI</option>
              <option value="bt">Bluetooth</option>
              <option value="either">Either is fine</option>
            </select>
          </label>
          <div class="col-span-full flex gap-2 mt-1">
            <button class="text-sm font-semibold px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 border border-red-600" type="submit">Get Recommendation</button>
            <button type="button" id="finderClose2" class="text-sm border border-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-800">Close</button>
          </div>
        </form>
        <div id="finderResult" class="hidden mt-4 bg-zinc-800/60 border border-zinc-700 rounded-xl p-3">
          <h3 class="font-semibold text-emerald-300">Your Match</h3>
          <p id="matchText" class="text-zinc-200 mt-1"></p>
          <div id="matchWhy" class="text-sm text-zinc-300 mt-2"></div>
          <button id="openMatch" class="mt-3 text-sm font-semibold px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 border border-red-600">View This Kit</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  const close = ()=>closeModal(m);
  m.addEventListener('click', (e)=>{ if(e.target===m) close(); });
  $('#finderClose', m).addEventListener('click', close);
  $('#finderClose2', m).addEventListener('click', close);
  $('#finderForm', m).addEventListener('submit', onFinderSubmit);
  return m;
}
function openFinder(){ const m=ensureFinderModal(); m.classList.remove('hidden'); m.classList.add('flex'); }
function finderScore(k,p){ // unchanged from your last version
  function budget(){ const pz=k.price||0, b=p.budget;
    if(b==='under2') return pz<2000?1:(pz<3000?.4:0);
    if(b==='2to5')   return (pz>=2000&&pz<=5000)?1:(pz<2000||pz<=6500?.55:.25);
    if(b==='over5')  return pz>5000?1:(pz>=3500?.45:.2);
    return .3; }
  function space(){ const pcs=k.traits.pieces||0, s=p.space;
    if(s==='compact') return pcs<=7?1:(pcs<=9?.5:.2);
    if(s==='large')   return pcs>=9?1:(pcs>=8?.6:.3);
    return .7; }
  function exp(){ const e=p.exp;
    if(e==='beginner') return (k.traits.starter||k.price<=3000)?1:.45;
    if(e==='advanced') return (k.traits.pro||k.traits.triple||k.price>=5000)?1:.5;
    return .75; }
  function goal(){ const g=p.goal;
    if(g==='learning')   return (k.traits.learning||k.traits.mesh)?1:.5;
    if(g==='recording')  return (k.traits.usb||k.traits.recording)?1:.45;
    if(g==='performing') return (k.traits.pro||k.traits.triple||k.traits.touch||k.price>5000)?1:.45;
    return .5; }
  function noise(){ const n=p.noise;
    const base = (k.traits.mesh?1:.5) * ((k.traits.pieces||0)<=7?1:.7);
    if(n==='high') return base;
    if(n==='medium') return Math.max(.6, base*.8);
    return .6; }
  function conn(){ const c=p.conn; if(c==='usb') return k.traits.usb?1:.4; if(c==='bt') return k.traits.bluetooth?1:.4; return .7; }
  return budget()*.28 + space()*.16 + exp()*.22 + goal()*.22 + noise()*.06 + conn()*.06;
}
function onFinderSubmit(e){
  e.preventDefault();
  const form = new FormData(e.target);
  const prefs = { exp:form.get('exp'), budget:form.get('budget'), space:form.get('space'),
                  goal:form.get('goal'), noise:form.get('noise'), conn:form.get('conn') };
  const scored=state.kits.filter(k=>k.is_active).map(k=>({k, s: finderScore(k,prefs)})).sort((a,b)=>b.s-a.s);
  const pick=(scored[0]||{}).k || state.kits[0]; if(!pick) return;
  const why=[];
  if(prefs.budget==='under2' && pick.price<2000) why.push('fits your budget under AED 2,000');
  if(prefs.budget==='2to5' && pick.price>=2000 && pick.price<=5000) why.push('priced in AED 2,000–5,000 band');
  if(prefs.budget==='over5' && pick.price>5000) why.push('premium tier performance');
  if(prefs.space==='compact' && (pick.traits.pieces||0)<=7) why.push('compact footprint');
  if(prefs.space==='large' && (pick.traits.pieces||0)>=9) why.push('larger stage-ready setup');
  if(prefs.exp==='beginner' && (pick.traits.starter||pick.price<=3000)) why.push('great for getting started');
  if(prefs.exp==='advanced' && (pick.traits.pro||pick.traits.triple||pick.price>5000)) why.push('advanced/pro features');
  if(prefs.goal==='learning' && (pick.traits.learning||pick.traits.mesh)) why.push('learning tools / mesh feel');
  if(prefs.goal==='recording' && (pick.traits.usb||pick.traits.recording)) why.push('USB/MIDI for DAWs');
  if(prefs.goal==='performing' && (pick.traits.triple||pick.traits.touch||pick.traits.pro)) why.push('live performance focus');
  if(prefs.noise==='high' && pick.traits.mesh) why.push('mesh heads for quieter practice');
  if(prefs.conn==='usb' && pick.traits.usb) why.push('USB/MIDI connectivity');
  if(prefs.conn==='bt' && pick.traits.bluetooth) why.push('Bluetooth playback');
  $('#finderResult').classList.remove('hidden');
  $('#matchText').innerHTML = `<b>${pick.name}</b> looks like a great fit at ${money(pick.price)}.`;
  $('#matchWhy').textContent = `Because it ${why.length?why.join(', '):'balances features and price for your answers'}.`;
  $('#openMatch').onclick = () => { closeModal($('#finderModal')); openDetail(pick.id); };
}

function bindUI(){
  // Remove the header H1 and the small data note under it
  const header = document.querySelector('header');
  header?.querySelectorAll('h1, p').forEach(el=>el.remove());

  // Filter chips
  $$('#app [data-filter]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.activeFilter = btn.getAttribute('data-filter');
      $$('#app [data-filter]').forEach(b=>b.classList.remove('ring-2','ring-red-400'));
      btn.classList.add('ring-2','ring-red-400');
      render();
    });
  });
}

(async function init(){
  try{
    bindUI();
    ensureActionBar();
    await loadKits();
    render();
  }catch(err){
    console.error(err);
    $('#kitGrid').innerHTML = `<div class="col-span-full text-center text-red-300">Failed to load kits from /api/kits.</div>`;
  }
})();

// Ensure tab title at runtime
if (document && document.title !== "Alesis Soundstage") { document.title = "Alesis Soundstage"; }
