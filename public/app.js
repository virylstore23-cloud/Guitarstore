/* === SUPA SINGLETON (idempotent) === */
const ENV = window.ENV || {};
if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) throw new Error('env.js missing');
if (!window.supabase) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  window.supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
}
/* === END SUPA SINGLETON === */
/* === BOOTSTRAP (ENV + Supabase) === */
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ENV || {};
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { throw new Error('env.js missing or incomplete'); }
/* === end bootstrap === */
