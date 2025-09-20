// === SUPABASE BOOTSTRAP START ===
const env = await fetch('/api/env').then(r => r.json());
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

const state = { kits: [], byId: new Map() };

async function loadKits() {
  const { data, error } = await supabase
    .from('drum_kits')                     // ← IMPORTANT: table name
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) { console.error('Load kits failed:', error); return; }
  state.kits = data || [];
  state.byId = new Map(state.kits.map(k => [String(k.id), k]));
  if (typeof renderGrid === 'function') renderGrid();
}

await loadKits();

// Realtime
supabase
  .channel('public:drum_kits')            // ← IMPORTANT: schema:table
  .on('postgres_changes', { event: '*', schema: 'public', table: 'drum_kits' }, (payload) => {
    const id = String((payload.new ?? payload.old).id);
    if (payload.eventType === 'DELETE') state.byId.delete(id);
    else state.byId.set(id, payload.new);
    state.kits = Array.from(state.byId.values());
    if (typeof renderGrid === 'function') renderGrid();
  })
  .subscribe((status) => console.log('Realtime status:', status));
// === SUPABASE BOOTSTRAP END ===