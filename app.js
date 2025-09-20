// --- Supabase bootstrap (HTTPS/WebSocket only) ---
const env = await fetch('/api/env').then(r => r.json());
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// keep your current state if it exists
window.state = window.state || { kits: [], byId: new Map(), selected: new Set(), activeFilter: 'all' };

// fallback renderer if your app doesn't define one
window.renderGrid = window.renderGrid || function renderGridFallback() {
  const root = document.getElementById('kitGrid') || document.body;
  const items = Array.from(state.byId.values());
  root.innerHTML = items.length
    ? items.map(k => `<div class="p-3 border border-zinc-700 rounded mb-2">
        <div class="text-sm text-zinc-400">${k.slug || ''}</div>
        <div class="text-lg font-semibold">${k.name || 'Unnamed'}</div>
        <div class="text-zinc-300">${k.description || ''}</div>
        <div class="text-emerald-400 mt-1">${k.price != null ? 'AED ' + Number(k.price).toFixed(2) : '—'}</div>
      </div>`).join('')
    : '<div class="text-zinc-400">No kits yet.</div>';
};

// initial load
async function loadKits() {
  const { data, error } = await supabase
    .from('kits')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) { console.error('Load kits failed:', error); return; }
  state.kits = data || [];
  state.byId = new Map(state.kits.map(k => [String(k.id), k]));
  renderGrid();
}
await loadKits();

// realtime updates
supabase
  .channel('public:kits')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'kits' }, (payload) => {
    const id = String((payload.new ?? payload.old).id);
    if (payload.eventType === 'DELETE') state.byId.delete(id);
    else state.byId.set(id, payload.new);
    state.kits = Array.from(state.byId.values());
    renderGrid();
  })
  .subscribe((status) => console.log('Realtime status:', status));
// --- end Supabase bootstrap ---
