/* === Supabase bootstrap (idempotent) === */
const __ENV__ = window.ENV || {};
if (!__ENV__.SUPABASE_URL || !__ENV__.SUPABASE_ANON_KEY) { throw new Error('env.js missing SUPABASE values'); }
if (!window.supabase) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  window.supabase = createClient(__ENV__.SUPABASE_URL, __ENV__.SUPABASE_ANON_KEY);
}
const supabase = window.supabase;
/* === end bootstrap === */
// public/app.js
const SUPABASE_URL = window.ENV?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('env.js missing');


// Create once, reuse (prevents “already declared” errors)

const grid = document.getElementById('kitGrid') || (()=>{
  const d=document.createElement('div'); d.id='kitGrid';
  d.className='grid gap-3 max-w-5xl mx-auto p-4'; document.body.appendChild(d); return d;
})();
const money = n => (n == null ? '—' : 'AED ' + Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));

async function load() {
  const { data, error } = await supabase
    .from('drum_kits')              // ✅ correct table
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) {
    console.error('Load kits failed:', error);
    grid.innerHTML = `<div class="text-red-300">Failed to load kits.</div>`;
    return;
  }
  render(data || []);
}

function render(rows) {
  if (!rows.length) {
    grid.innerHTML = `<div class="text-zinc-400">No kits yet.</div>`;
    return;
  }
  grid.innerHTML = rows.map(k => `
    <article class="p-3 border border-zinc-700 rounded-lg bg-zinc-800/50">
      <div class="text-sm text-zinc-400">${k.slug || ''}</div>
      <div class="text-lg font-semibold">${k.name || 'Unnamed'}</div>
      <p class="text-zinc-300">${k.description || ''}</p>
      <div class="mt-1 text-emerald-400">${money(k.price)}</div>
    </article>
  `).join('');
}

await load();

// Live updates
supabase
  .channel('public:drum_kits')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'drum_kits' }, load)
  .subscribe();

// === public bindings (so index.html buttons work) ===
(function(){
  try {
    if (typeof window.openFinder   !== 'function' && typeof openFinder   === 'function') window.openFinder = openFinder;
    if (typeof window.openDetail   !== 'function' && typeof openDetail   === 'function') window.openDetail = openDetail;
    if (typeof window.openCompare  !== 'function' && typeof openCompare  === 'function') window.openCompare = openCompare;
    if (typeof window.render       !== 'function' && typeof render       === 'function') window.render       = render;
  } catch (_) {}
  // Best Value = cheapest active drum KIT (ignore amps/accessories) with a price
  function bestValueId() {
    const items = Array.from((window.state?.byId || new Map()).values() || []);
    const list = items.filter(k => k?.is_active && k?.price!=null && (window.deriveCategory ? (window.deriveCategory(k) !== 'Drum Amps') : true));
    if (!list.length) return null;
    list.sort((a,b)=> Number(a.price)-Number(b.price));
    return String(list[0].id);
  }
  if (typeof window.openBestValue !== 'function') {
    window.openBestValue = function(){
      const id = bestValueId();
      if (id && typeof openDetail === 'function') openDetail(id);
      else alert('No kits available yet.');
    }
  }
  if (typeof window.browseKits !== 'function') {
    window.browseKits = function(){
      const g=document.getElementById('kitGrid');
      if(g) window.scrollTo({top:g.getBoundingClientRect().top + window.scrollY - 60, behavior:'smooth'});
    }
  }
})();
 // === end bindings ===
