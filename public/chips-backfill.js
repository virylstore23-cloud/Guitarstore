/** Backfill up to 3 chips from Supabase (priority Mesh > USB/MIDI > Bluetooth, then features[]) */
async function backfillChipsMax3() {
  if (!window.supabase) return;

  const cards = [...document.querySelectorAll('#kitGrid .kit-card')];

  const targets = cards
    .filter(c => !c.querySelector('.pill,.chip'))
    .map(c => {
      const raw = c.querySelector('[data-upc]')?.getAttribute('data-upc')
        || c.querySelector('.upc')?.textContent || '';
      return { el: c, upc: raw.replace(/\D/g,'') };
    })
    .filter(x => x.upc);

  if (!targets.length) return;

  const upcs = [...new Set(targets.map(t => t.upc))];

  const { data, error } = await supabase
    .from('products_features')
    .select('upc,mesh,usb_midi,bluetooth_audio,features')
    .in('upc', upcs);

  if (error) { console.warn('Supabase chips error', error); return; }

  const byUPC = new Map(
    (data || []).map(r => [String(r.upc), {
      mesh: !!r.mesh, usb: !!r.usb_midi, bt: !!r.bluetooth_audio,
      features: Array.isArray(r.features) ? r.features : []
    }])
  );

  const addChips = (el, labels) => {
    const container = el.querySelector('.tags, .pills, .meta') || el;
    labels.forEach(txt => {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = txt;
      container.appendChild(pill);
    });
  };

  targets.forEach(({el, upc}) => {
    const rec = byUPC.get(String(upc));
    if (!rec) return;

    const picked = [];
    const seen = new Set();
    const add = (label) => {
      const clean = (label || '').trim();
      if (!clean || clean.length > 24) return;
      const key = clean.toLowerCase();
      if (seen.has(key) || picked.length >= 3) return;
      seen.add(key); picked.push(clean);
    };

    if (rec.mesh) add('Mesh');
    if (rec.usb)  add('USB/MIDI');
    if (rec.bt)   add('Bluetooth');

    for (const f of rec.features) {
      if (picked.length >= 3) break;
      add(f);
    }

    if (picked.length) addChips(el, picked);
  });
}
window.addEventListener('DOMContentLoaded', backfillChipsMax3);
