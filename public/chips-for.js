export function chipsFor(item){
  const MAX = 3, out = [], seen = new Set();
  const yes = v => v === true || v === 1 || v === '1' || v === 'true';

  const add = s => {
    const t = String(s ?? '').trim();
    if (!t || t.length > 24) return;
    const k = t.toLowerCase();
    if (seen.has(k) || out.length >= MAX) return;
    seen.add(k); out.push(t);
  };

  // standard flags
  if (yes(item.mesh)) add('Mesh');
  if (yes(item.usb_midi ?? item.usb)) add('USB/MIDI');
  if (yes(item.bluetooth_audio ?? item.bt ?? item.bluetooth)) add('Bluetooth');

  // skip near-duplicates of standards
  const isStd = s => {
    const k = String(s || '').toLowerCase();
    return k === 'mesh'
        || (k.includes('usb') && k.includes('midi'))
        || k === 'bluetooth' || k.startsWith('bluetooth ');
  };

  for (const f of (item.features || [])) {
    if (out.length >= MAX) break;
    if (isStd(f)) continue;
    add(f);
  }
  return out;
}
