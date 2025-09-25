/** Fetch mesh/USB/Bluetooth + features by UPC and stamp them onto .kit-card */
(async function(){
  const EXT = (window.EXT||window);
  const URL = EXT.SUPABASE_URL;
  const KEY = EXT.SUPABASE_ANON_KEY;
  if(!URL || !KEY) return console.warn('[chips-fetch] Missing SUPABASE env');

  // Collect UPCs from cards
  const cards = Array.from(document.querySelectorAll('.kit-card'));
  const upcs = cards.map(el => (el.dataset.upc || '').trim()).filter(Boolean);
  if(!upcs.length) return;

  // Fetch rows from the products_features view
  const q = new URL(`${URL}/rest/v1/products_features`);
  q.searchParams.set('select', 'upc,mesh,usb_midi,bluetooth_audio,features');
  // in() filter
  q.searchParams.set('upc', `in.(${upcs.map(u=>`"${u}"`).join(',')})`);

  const resp = await fetch(q, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  }).catch(e=>console.error(e));
  if(!resp || !resp.ok) return console.warn('[chips-fetch] fetch failed');

  const rows = await resp.json();
  const byUPC = new Map(rows.map(r => [String(r.upc||'').trim(), r]));

  cards.forEach(el=>{
    const upc = (el.dataset.upc || '').trim();
    const r = byUPC.get(upc);
    if(!r) return;
    // stamp data-* so backfill can read it
    if (r.mesh != null)              el.dataset.mesh = String(!!r.mesh);
    if (r.usb_midi != null)          el.dataset.usbMidi = String(!!r.usb_midi);
    if (r.bluetooth_audio != null)   el.dataset.bluetoothAudio = String(!!r.bluetooth_audio);
    if (Array.isArray(r.features))   el.dataset.features = JSON.stringify(r.features);
  });

  // Let the backfill script run (if it already loaded) or fire an event it listens for
  document.dispatchEvent(new CustomEvent('chips:data-ready'));
})();
