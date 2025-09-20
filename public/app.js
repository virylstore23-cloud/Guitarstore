/* === SUPABASE SINGLETON BOOTSTRAP === */
const { SUPABASE_URL, SUPABASE_ANON_KEY } = (window.ENV || {});
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('env.js missing');

const supa = await import('https://esm.sh/@supabase/supabase-js@2');
window.supabase = window.supabase || supa.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabase = window.supabase;
/* === END === */
/* === BOOTSTRAP (ENV + Supabase) === */
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ENV || {};
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { throw new Error('env.js missing or incomplete'); }
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
/* === end bootstrap === */
