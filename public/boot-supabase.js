import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const url = window?.ENV?.SUPABASE_URL;
const key = window?.ENV?.SUPABASE_ANON_KEY;
if (!url || !key) console.error('ENV missing SUPABASE_URL or SUPABASE_ANON_KEY');
window.supabase = createClient(url, key);
