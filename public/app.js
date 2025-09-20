/* === SUPABASE SINGLETON (idempotent) === */
const __ENV = window.ENV || {};
if (!__ENV.SUPABASE_URL || !__ENV.SUPABASE_ANON_KEY) { throw new Error('env.js missing'); }
/* cache the module & client on window so we never redeclare consts */
var __SUPA_MOD = window.__SUPA_MOD || (window.__SUPA_MOD = await import('https://esm.sh/@supabase/supabase-js@2'));
window.supabase = window.supabase || __SUPA_MOD.createClient(__ENV.SUPABASE_URL, __ENV.SUPABASE_ANON_KEY);
/* expose a non-const ref used by the rest of this file */
var supabase = window.supabase;
/* === END SINGLETON === */
/* === SUPABASE SINGLETON BOOTSTRAP === */
const { SUPABASE_URL, SUPABASE_ANON_KEY } = (window.ENV || {});
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('env.js missing');

const supabase = window.supabase;
/* === END === */
/* === BOOTSTRAP (ENV + Supabase) === */
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ENV || {};
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { throw new Error('env.js missing or incomplete'); }
/* === end bootstrap === */
