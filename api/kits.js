import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_KEY; // anon or service key with read scope
const supabase = createClient(url, key);

// robust array parser: JSON string -> array, comma string -> array, else []
const toArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      try { return JSON.parse(s); } catch { return []; }
    }
    return s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
  }
  return [];
};

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from('drum_kits')
      .select(`
        id, name, slug, description,
        price, upc_code, is_active,
        on_demo, on_demo_label,
        primary_image_url, detail_image_url, video_url,
        features, contents, images, stock_level, updated_at
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const kits = (data || []).map(k => ({
      ...k,
      price: k.price == null ? null : Number(k.price),
      features: toArray(k.features),
      contents: toArray(k.contents),
    }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, count: kits.length, kits });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
