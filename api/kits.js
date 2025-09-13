import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.error('Missing envs', { hasURL: !!url, hasKEY: !!key });
      return res.status(500).json({ ok:false, error:'Server misconfigured: SUPABASE envs missing' });
    }

    const supabase = createClient(url, key, { db: { schema: 'public' } });

    const { data, error } = await supabase
      .from('drum_kits')
      .select(`
        id, name, description, price, upc_code, video_url,
        is_active, updated_at, contents, features, on_demo, on_demo_label,
        primary_image_url, detail_image_url
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase error', error);
      return res.status(500).json({ ok:false, error:error.message });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok:true, count: data?.length || 0, kits: data || [] });
  } catch (e) {
    console.error('API /kits crash', e);
    return res.status(500).json({ ok:false, error:'Failed to load kits' });
  }
}
