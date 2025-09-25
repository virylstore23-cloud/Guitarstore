/** Backfill up to 3 chips per card. Priority: Mesh, USB/MIDI, Bluetooth, then short unique features. */
(function(){
  const MAX = 3;
  const yes = v => v === true || v === 'true' || v === 1 || v === '1';

  function parseFeatures(raw){
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { const j = JSON.parse(raw); if (Array.isArray(j)) return j; } catch(e){}
    return String(raw).split(',').map(s=>s.trim()).filter(Boolean);
  }

  function ensureRow(el){
    let row = el.querySelector('.chip-row,.card-chips,.pills,.tags');
    if (!row) {
      row = document.createElement('div');
      row.className = 'chip-row';
      const title = el.querySelector('h3,h2,.title') || el.firstElementChild;
      title && title.nextSibling ? el.insertBefore(row, title.nextSibling) : el.appendChild(row);
    }
    row.querySelectorAll('[data-chip-auto]').forEach(n=>n.remove());
    return row;
  }

  function addChips(el, labels){
    const row = ensureRow(el);
    labels.forEach(t=>{
      const b = document.createElement('button');
      b.className = 'chip';
      b.type = 'button';
      b.textContent = t;
      b.setAttribute('data-chip-auto','');
      row.appendChild(b);
    });
  }

  function normalize(el){
    const rec = {
      mesh: yes(el.dataset.mesh),
      usb:  yes(el.dataset.usb) || yes(el.dataset.usbMidi) || yes(el.dataset.usb_midi),
      bt:   yes(el.dataset.bt)  || yes(el.dataset.bluetooth) || yes(el.dataset.bluetoothAudio) || yes(el.dataset.bluetooth_audio),
      features: parseFeatures(el.dataset.features).filter(s=>s.length<=24)
    };

    // Infer ONLY if text clearly mentions USB (not plain DIN MIDI)
    const ftext = rec.features.map(s=>s.toLowerCase());
    if (!rec.mesh) rec.mesh = ftext.some(s => /\bmesh\b/.test(s));
    if (!rec.usb)  rec.usb  = ftext.some(s => s.includes('usb')); // do not trigger on bare 'midi'
    if (!rec.bt)   rec.bt   = ftext.some(s => s.includes('bluetooth') || /\bbt\b/.test(s));

    return rec;
  }

  function pick(rec){
    const picked=[], seen=new Set();
    const add = (label)=>{
      const t=(label||'').trim(); if(!t || t.length>24) return;
      const k=t.toLowerCase(); if(seen.has(k) || picked.length>=MAX) return;
      seen.add(k); picked.push(t);
    };
    if (rec.mesh) add('Mesh');
    if (rec.usb)  add('USB/MIDI');
    if (rec.bt)   add('Bluetooth');
    for (const f of rec.features){ if (picked.length>=MAX) break; add(f); }
    return picked;
  }

  function run(){
    document.querySelectorAll('.kit-card').forEach(el=>{
      const labels = pick(normalize(el));
      if (labels.length) addChips(el, labels);
    });
  }

  window.addEventListener('DOMContentLoaded', run);
  // re-run after chips-fetch stamps datasets
  document.addEventListener('chips:data-ready', run);
})();
