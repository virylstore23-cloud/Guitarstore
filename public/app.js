// === SUPABASE BOOTSTRAP START ===
const env = await fetch('/api/env').then(r => r.json());
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Reuse your app's state if defined later; otherwise make one here.
// (We won't re-declare a second const state below.)
window.state = window.state || { kits: [], byId: new Map(), selected: new Set(), activeFilter: 'all' };

// Load from Supabase
async function loadKitsFromSupabase() {
  const { data, error } = await supabase
    .from('drum_kits')                     // ✅ correct table
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) { console.error('Load kits failed:', error); return; }
  state.kits = data || [];
  state.byId = new Map(state.kits.map(k => [String(k.id), k]));
  if (typeof render === 'function') render();     // ✅ call your main renderer
}
await loadKitsFromSupabase();

// Realtime on the correct table
supabase
  .channel('public:drum_kits')             // ✅ correct channel
  .on('postgres_changes', { event: '*', schema: 'public', table: 'drum_kits' }, (payload) => {
    const id = String((payload.new ?? payload.old).id);
    if (payload.eventType === 'DELETE') state.byId.delete(id);
    else state.byId.set(id, payload.new);
    state.kits = Array.from(state.byId.values());
    if (typeof render === 'function') render();   // ✅ re-render after changes
  })
  .subscribe((status) => console.log('Realtime status:', status));
// === SUPABASE BOOTSTRAP END ===