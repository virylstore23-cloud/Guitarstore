import { chipsFor } from './chips-for.js';

const SUPABASE_URL = window.SUPABASE_URL || (document.querySelector('meta[name="supabase-url"]')?.content);
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || (document.querySelector('meta[name="supabase-key"]')?.content);

// naive REST fetch - assumes RLS allows anon read for products_features
async function getByUPCs(upcs){
  const url = `${SUPABASE_URL}/rest/v1/products_features?select=upc,mesh,usb_midi,bluetooth_audio,features&upc=in.(${upcs.map(u=>`"${u}"`).join(',')})`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }});
  if (!res.ok) throw new Error(`Supabase REST ${res.status}`);
  const rows = await res.json();
  const map = new Map(rows.map(r => [String(r.upc), r]));
  return map;
}

function ensureChipRow(el){
  let row = el.querySelector('.chip-row') || el.querySelector('.card-chips') || el.querySelector('.pills') || el.querySelector('.tags');
  if (!row) {
    row = document.createElement('div');
    row.className = 'chip-row';
    const h = el.querySelector('h3, h2, .title') || el.firstElementChild;
    if (h && h.nextSibling) el.insertBefore(row, h.nextSibling);
    else el.appendChild(row);
  }
  row.querySelectorAll('[data-chip-auto]').forEach(n => n.remove());
  return row;
}

function addChips(el, labels){
  const row = ensureChipRow(el);
  labels.forEach(txt=>{
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.textContent = txt;
    b.setAttribute('data-chip-auto','');
    row.appendChild(b);
  });
}

async function run(){
  const cards = Array.from(document.querySelectorAll('.kit-card'));
  if (!cards.length) return;

  const upcs = cards.map(el => el.dataset.upc || el.getAttribute('data-upc')).filter(Boolean).map(String);
  if (!upcs.length) return;

  let byUPC;
  try {
    byUPC = await getByUPCs(upcs);
  } catch(e){
    console.warn('Supabase fetch failed:', e);
    return;
  }

  for (const el of cards){
    const upc = String(el.dataset.upc || el.getAttribute('data-upc') || '');
    const rec = byUPC.get(upc);
    if (!rec) continue;
    const chips = chipsFor(rec);
    if (chips.length) addChips(el, chips);
  }
}

window.addEventListener('DOMContentLoaded', run);
