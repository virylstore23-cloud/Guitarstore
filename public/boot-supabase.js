import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const url = window?.ENV?.SUPABASE_URL, key = window?.ENV?.SUPABASE_ANON_KEY;
if (!url || !key) console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY in /env.js');
window.supabase = createClient(url, key);
