// Pull creds from meta or globals
const SUPABASE_URL = window.SUPABASE_URL
  || document.querySelector('meta[name="supabase-url"]')?.content;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY
  || document.querySelector('meta[name="supabase-key"]')?.content;

// Find cards by attribute OR common class names
function findCards() {
  const nodes = new Set();
  document.querySelectorAll('[data-upc]').forEach(n => nodes.add(n.closest('[data-upc]') || n));
  document.querySelectorAll('.kit-card,.product-card,.card').forEach(n => nodes.add(n));
  return [...nodes];
}

function getUPC(el) {
  // direct on the card
  let u = el.dataset?.upc || el.getAttribute('data-upc');
  if (u) return String(u).trim();
  // nested element with data-upc
  const child = el.querySelector('[data-upc]');
  if (child) return String(child.dataset.upc || child.getAttribute('data-upc') || '').trim();
  // last resort: parse text after "UPC:"
  const m = el.textContent.match(/UPC:\s*([0-9"]{8,20})/i);
  return m ? m[1].replace(/"/g,'').trim() : '';
}

function chipsFor(item){
  const MAX=3, out=[], seen=new Set();
  const yes=v=>v===true||v===1||v==='1'||v==='true';
  const add=s=>{
    const t=String(s??'').trim();
    if(!t || t.length>24) return;
    const k=t.toLowerCase();
    if(seen.has(k) || out.length>=MAX) return;
    seen.add(k); out.push(t);
  };
  if(yes(item.mesh)) add('Mesh');
  if(yes(item.usb_midi)) add('USB/MIDI');
  if(yes(item.bluetooth_audio)) add('Bluetooth');
  const isStd=s=>{
    const k=String(s||'').toLowerCase();
    return k==='mesh' || (k.includes('usb')&&k.includes('midi')) || k==='bluetooth' || k.startsWith('bluetooth ');
  };
  for(const f of (item.features||[])){
    if(out.length>=MAX) break;
    if(isStd(f)) continue;
    add(f);
  }
  return out;
}

function ensureChipRow(el){
  let row = el.querySelector('.chip-row,.card-chips,.pills,.tags');
  if(!row){ row = document.createElement('div'); row.className='chip-row'; el.appendChild(row); }
  row.querySelectorAll('[data-chip-auto]').forEach(n=>n.remove());
  return row;
}

function addChips(el, labels){
  const row = ensureChipRow(el);
  labels.forEach(txt=>{
    const b=document.createElement('button');
    b.className='chip'; b.type='button'; b.textContent=txt; b.setAttribute('data-chip-auto','');
    row.appendChild(b);
  });
}

async function run(){
  const cards = findCards();
  if (!cards.length) return; // nothing to do yet (maybe later hydration)
  const upcs = cards.map(getUPC).filter(Boolean);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !upcs.length) return;

  const url = `${SUPABASE_URL}/rest/v1/products_features`
    + `?select=upc,mesh,usb_midi,bluetooth_audio,features`
    + `&upc=in.(${upcs.map(u=>`"${u}"`).join(',')})`;

  const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }});
  if (!res.ok) return;
  const rows = await res.json();
  const byUPC = new Map(rows.map(r => [String(r.upc), r]));

  cards.forEach(el=>{
    const u = getUPC(el);
    const rec = byUPC.get(u);
    if(!rec) return;
    const labels = chipsFor(rec);
    if(labels.length) addChips(el, labels);
  });
}

// Run after DOM ready and also after images (in case layout injects late)
window.addEventListener('DOMContentLoaded', run);
window.addEventListener('load', run);
