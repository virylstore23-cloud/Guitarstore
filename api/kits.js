export default async function handler(req, res) {
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      // Fetch from Supabase REST
      const url = new URL('/rest/v1/drum_kits', SUPABASE_URL);
      url.searchParams.set(
        'select',
        'id,name,price,upc_code,video_url,is_active,updated_at,contents,features,on_demo,on_demo_label,primary_image_url,detail_image_url'
      );
      url.searchParams.set('order', 'price.asc.nullslast');

      const r = await fetch(url.toString(), {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      if (!r.ok) throw new Error(`Supabase REST ${r.status}`);
      const kits = await r.json();
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, count: kits.length, kits });
    }

    // Fallback: fetch your static JSON from the same deployment
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'localhost:5173';
    const j = await (await fetch(`${proto}://${host}/kits_live.json`)).json();
    const kits = Array.isArray(j) ? j : (j.kits || []);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, count: kits.length, kits });
  } catch (err) {
    console.error('API /api/kits error:', err);
    return res.status(200).json({ ok: false, error: String(err?.message || err) });
  }
}
