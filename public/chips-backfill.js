/** Backfill up to 3 feature chips per kit card.
 * Priority: Mesh, USB/MIDI, Bluetooth, then unique short features.
 * Reads from element dataset (data-*) so it works with current HTML.
 */
(function(){
  const MAX = 3;

  const yes = v => v === true || v === 'true' || v === 1 || v === '1';

  function parseFeatures(raw){
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) return j;
    } catch(_) {}
    // fall back to comma-separated
    return String(raw).split(',').map(s => s.trim()).filter(Boolean);
  }

  function ensureChipRow(el){
    // Try a few common containers, or create our own light wrapper.
    let row =
      el.querySelector('.chip-row') ||
      el.querySelector('.card-chips') ||
      el.querySelector('.pills') ||
      el.querySelector('.tags');

    if (!row) {
      row = document.createElement('div');
      row.className = 'chip-row';
      // append near the title if possible
      const h = el.querySelector('h3, h2, .title') || el.firstElementChild;
      if (h && h.nextSibling) el.insertBefore(row, h.nextSibling);
      else el.appendChild(row);
    }
    // Remove any chips we added previously
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

  function pickLabels(rec){
    const picked = [];
    const seen = new Set();
    const add = (label) => {
      const clean = (label || '').trim();
      if (!clean || clean.length > 24) return;
      const key = clean.toLowerCase();
      if (seen.has(key) || picked.length >= MAX) return;
      seen.add(key);
      picked.push(clean);
    };

    if (rec.mesh) add('Mesh');
    if (rec.usb)  add('USB/MIDI');
    if (rec.bt)   add('Bluetooth');

    for (const f of rec.features){
      if (picked.length >= MAX) break;
      add(f);
    }
    return picked;
  }

  function normalizeRecord(rowLike){
    const row = rowLike || {};
    const rec = {
      mesh: yes(row.mesh ?? row.dataset?.mesh),
      // map usb_midi -> usb, bluetooth_audio -> bt
      usb:  yes(row.usb ?? row.usb_midi ?? row.dataset?.usb ?? row.dataset?.usbMidi ?? row.dataset?.usb_midi),
      bt:   yes(row.bt  ?? row.bluetooth_audio ?? row.dataset?.bt  ?? row.dataset?.bluetooth ?? row.dataset?.bluetoothAudio ?? row.dataset?.bluetooth_audio),
      features: []
    };
    // Accept JSON array in data-features or comma-separated
    const df = row.features ?? row.dataset?.features;
    rec.features = parseFeatures(df).filter(s => s.length <= 24);
    return rec;
  }

  function backfill(){
    document.querySelectorAll('.kit-card').forEach(el=>{
      const rec = normalizeRecord(el);
      const labels = pickLabels(rec);
      if (labels.length) addChips(el, labels);
    });
  }

  window.addEventListener('DOMContentLoaded', backfill);
})();
