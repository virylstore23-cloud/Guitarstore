/* Alesis Soundstage – vanilla JS UI */
const sb = window.supabase;  // env.js should have created this
const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];
const AED = v => `AED ${Number(v||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

const LABEL_TO_CATEGORY = {
  "Electronic Drum Kits":"Drum Kits",
  "Multipads & Drum Machines":"Accessories",        // your seeding stores these in Accessories
  "Drum Amplification":"Drum Amps",
  "Accessories":"Accessories"
};

const state = {
  rows: [],
  byId: new Map(),
  filterLabel: "All",
  compare: new Set(),
};

/* ---------- Data ---------- */
async function load(){
  const { data, error } = await sb.from('drum_kits')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending:true });
  if(error){ console.error(error); return; }
  state.rows = data || [];
  state.byId = new Map(state.rows.map(r=>[String(r.id), r]));
  render();
}

/* ---------- Filters ---------- */
function filtered(){
  const label = state.filterLabel;
  if(label === "All") return state.rows;
  if(label === "On Demo") return state.rows.filter(r=> !!r.on_demo);
  const cat = LABEL_TO_CATEGORY[label];
  return state.rows.filter(r=> r.category === cat);
}

/* ---------- Card ---------- */
function card(r){
  const demoText = r.on_demo_label || (r.on_demo ? "On demo" : "");
  const img = r.primary_image_url || r.detail_image_url || "";
  const tags = [];
  if(/mesh/i.test(r.name||"") || (r.features||[]).join(' ').toLowerCase().includes('mesh')) tags.push('Mesh');
  if(r.snare_zones >= 2 || /dual/i.test((r.features||[]).join(' '))) tags.push('Dual-zone');
  if(r.usb_midi) tags.push('USB/MIDI');

  return `
  <article class="card" data-id="${r.id}">
    <a class="figure" href="#" data-open="${r.id}">
      ${demoText ? `<div class="ribbon">${demoText}</div>` : ``}
      <img src="${img}" alt="${r.name}" onerror="this.onerror=null;this.src='https://picsum.photos/800/450?grayscale';">
    </a>
    <div class="card-inner">
      <div class="title">${r.name}</div>
      <div class="muted">${r.description ?? ''}</div>
      <div class="price">
        <span class="pill pill-green">${AED(r.price)}</span>
        ${r.category ? `<span class="pill">${r.category}</span>` : ``}
      </div>
      ${r.upc_code ? `<div class="muted" style="font-size:12px">UPC: ${r.upc_code}</div>` : ``}
      <div class="tags">${tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
      <div class="foot">
        <a class="btn btn-ghost btn-pill" href="#" data-open="${r.id}">Explore</a>
        <label class="checkbox">
          <input type="checkbox" data-compare="${r.id}" ${state.compare.has(String(r.id))?'checked':''}/>
          <span>Add to compare</span>
        </label>
      </div>
    </div>
  </article>`;
}

/* ---------- Render ---------- */
function render(){
  // highlight active chip
  $$('#chipBar .chip').forEach(b=>{
    b.classList.toggle('active', b.getAttribute('data-filter')===state.filterLabel);
  });

  // grid
  const list = filtered();
  $('#grid').innerHTML = list.map(card).join('');

  // wire open/detail
  $$('[data-open]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      openDetail(a.getAttribute('data-open'));
    }, { once:true });
  });

  // wire compare checkboxes
  $$('[data-compare]').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      const id = cb.getAttribute('data-compare');
      cb.checked ? state.compare.add(id) : state.compare.delete(id);
      updateCompareBadge();
    });
  });

  updateCompareBadge();
}

function updateCompareBadge(){
  const n = state.compare.size;
  const btn = $('#btnCompareOpen');
  btn.setAttribute('data-count', String(n));
}

/* ---------- Detail ---------- */
function openDetail(id){
  const r = state.byId.get(String(id));
  if(!r) return;
  $('#detailTitle').textContent = r.name;
  const img = r.detail_image_url || r.primary_image_url || '';
  $('#detailImg').src = img;
  $('#detailImg').alt = r.name;
  $('#detailMeta').innerHTML = `
    <div class="price"><span class="pill pill-green">${AED(r.price)}</span></div>
    ${r.description ? `<p class="muted" style="margin:8px 0 12px">${r.description}</p>` : ``}
    ${(r.features && r.features.length) ? `<div class="tags">${r.features.map(f=>`<span class="tag">${f}</span>`).join('')}</div>` : ``}
  `;
  $('#detailWrap').classList.add('open');
}
function closeDetail(){ $('#detailWrap').classList.remove('open'); }
$('#detailWrap')?.addEventListener('click',(e)=>{ if(e.target?.dataset?.close || e.target===$('#detailWrap')) closeDetail(); });

/* ---------- Compare ---------- */
function openCompare(){
  const rows = [...state.compare].map(id => state.byId.get(String(id))).filter(Boolean);
  const headers = ['Model','Category','Price','Mesh / Dual-zone','Connectivity','On demo'];
  const cols = rows.map(r=>([
    `<div style="font-weight:800">${r.name}</div>`,
    r.category ?? '',
    AED(r.price),
    [/mesh/i.test(r.name||'')?'Mesh':'—', (r.snare_zones>=2||/dual/i.test((r.features||[]).join(' ')))?'Dual-zone':'—'].join(' / '),
    [r.usb_midi?'USB':'', r.bluetooth_audio?'Bluetooth':''].filter(Boolean).join(', ') || '—',
    r.on_demo ? (r.on_demo_label || 'On demo') : '—'
  ]));

  // Build a simple table
  const table = `
  <div style="min-width:760px;overflow:auto">
    <table style="border-collapse:separate;border-spacing:0 8px;width:100%">
      <thead>
        <tr>${[''].concat(rows.map(r=>r.name)).map(h=>`<th style="text-align:left;padding:8px 10px;color:#bcd"> ${h} </th>`).join('')}</tr>
      </thead>
      <tbody>
        ${headers.map((h,i)=>{
          const cells = rows.map((r,idx)=> cols[idx][i]);
          return `<tr>
            <td class="muted" style="padding:10px">${h}</td>
            ${cells.map(c=>`<td style="padding:10px;border:1px solid #243243;background:#0f151c;border-radius:12px">${c}</td>`).join('')}
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
  $('#compareArea').innerHTML = rows.length? table : `<div class="muted">No items selected. Tick “Add to compare” on a few products.</div>`;
  $('#compareModal').classList.add('open');
}
function closeCompare(){ $('#compareModal').classList.remove('open'); }
$('#btnCompareOpen').addEventListener('click', openCompare);
$('#btnCompareClose').addEventListener('click', closeCompare);
$('#compareModal').addEventListener('click', e=>{ if(e.target===e.currentTarget) closeCompare(); });

/* ---------- Wizard ---------- */
function openWizard(){ $('#wizardModal').classList.add('open'); }
function closeWizard(){ $('#wizardModal').classList.remove('open'); $('#suggestOut').innerHTML=''; }
$('#btnWizard').addEventListener('click', openWizard);
$('#btnWizardClose,#btnWizardClose2')?.addEventListener('click', closeWizard);

$('#btnSuggest').addEventListener('click', ()=>{
  const exp = $('#wExp').value;
  const bud = $('#wBudget').value;
  const space = $('#wSpace').value;
  const goal = $('#wGoal').value;
  const noise = $('#wNoise').value;
  const conn = $('#wConn').value;

  // Score drum kits only
  const kits = state.rows.filter(r=> r.category==='Drum Kits');
  const scored = kits.map(r=>{
    let s=0, why=[];
    // Budget bands
    const p = r.price||0;
    const inBand = (min,max)=> (p>=min && (max===null || p<=max));
    if(bud==='Under AED 2,000' && inBand(0,1999)) { s+=3; why.push('budget-friendly'); }
    if(bud==='AED 2,000 – 5,000' && inBand(2000,5000)) { s+=3; why.push('in AED 2,000–5,000 band'); }
    if(bud==='AED 5,000 – 9,000' && inBand(5001,9000)) { s+=3; why.push('mid-range'); }
    if(bud==='Over AED 9,000' && inBand(9001,null)) { s+=3; why.push('premium tier'); }

    // Space
    if(space==='Compact' && /nitro|turbo|debut|surge/i.test(r.slug)) { s+=2; why.push('compact footprint'); }
    if(space==='Large / Studio' && /strata|crimson/i.test(r.slug)) { s+=2; why.push('studio-ready'); }

    // Experience / goal nudges
    if(exp==='Beginner' && /nitro|debut|surge/i.test(r.slug)) { s+=2; why.push('great for learning'); }
    if(goal==='Learning' && /nitro|debut|surge/i.test(r.slug)) { s+=2; }
    if(goal==='Recording' && /strata|crimson/i.test(r.slug)) { s+=2; why.push('recording-grade sounds'); }
    if(goal==='Live Performance' && /strata|crimson/i.test(r.slug)) { s+=2; why.push('live performance features'); }

    // Noise -> mesh
    const mesh = /mesh/i.test(r.name||'') || (r.features||[]).join(' ').match(/mesh/i);
    if(noise==='High (keep it quiet)' && mesh){ s+=2; why.push('mesh heads for quieter practice'); }

    // Connectivity
    if(conn==='USB/MIDI' && r.usb_midi){ s+=2; why.push('USB/MIDI'); }
    if(conn==='Bluetooth' && r.bluetooth_audio){ s+=2; why.push('Bluetooth'); }

    return { r, s, why };
  }).sort((a,b)=> b.s - a.s);

  const top = scored[0];
  if(!top){ $('#suggestOut').innerHTML='<div class="muted">No kits found.</div>'; return; }
  const k = top.r;
  const because = [...new Set(top.why)].slice(0,5).join(', ');
  $('#suggestOut').innerHTML = `
    <div style="border:1px solid #2a3a4a;background:#0d141b;padding:12px;border-radius:14px;margin-top:6px">
      <div style="color:#6ef1b9;font-weight:900;margin-bottom:6px">Your Match</div>
      <div><b>${k.name}</b> looks like a great fit at <b>${AED(k.price)}</b>.</div>
      ${because? `<div class="muted" style="margin-top:6px">Because it ${because}.</div>` : ``}
      <div style="margin-top:10px">
        <a href="#" class="btn btn-primary btn-pill" data-open="${k.id}">View This Kit</a>
      </div>
    </div>`;
  // wire the CTA
  $$('[data-open]').forEach(a=>{
    a.addEventListener('click', (e)=>{ e.preventDefault(); openDetail(a.getAttribute('data-open')); }, { once:true });
  });
});

/* ---------- Filters wiring ---------- */
$$('[data-filter]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('#chipBar .chip').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.filterLabel = btn.getAttribute('data-filter');
    render();
  });
});

/* ---------- Boot + realtime ---------- */
await load();
sb.channel('public:drum_kits')
  .on('postgres_changes',{event:'*',schema:'public',table:'drum_kits'},(p)=>{
    const id = String((p.new ?? p.old).id);
    if (p.eventType==='DELETE') state.byId.delete(id);
    else state.byId.set(id, p.new);
    state.rows = Array.from(state.byId.values()).filter(r => r?.is_active);
    render();
  })
  .subscribe();
