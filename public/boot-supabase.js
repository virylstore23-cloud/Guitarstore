import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ENV || {};
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ENV missing SUPABASE_URL or SUPABASE_ANON_KEY');
}
window.supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
