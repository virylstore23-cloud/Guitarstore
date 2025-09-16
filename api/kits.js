// api/kits.js — match working production
export default async function handler(req, res) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Working prod uses the legacy view + active filter + name sort
    const url = `${base}/rest/v1/v_kits_legacy?select=*&is_active=eq.true&order=name.asc`;

    const r = await fetch(url, {
      method: 'GET',
      headers: { apikey: key, authorization: `Bearer ${key}` }
    });
    if (!r.ok) {
      const t = await r.text().catch(()=>'');
      throw new Error(`Upstream ${r.status}: ${t}`);
    }

    const rows = await r.json();

    // Keep old shape: ensure features/contents are arrays even if stored as JSON text
    const toArray = (v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') { try { const j = JSON.parse(v); return Array.isArray(j)? j:[]; } catch {} }
      return [];
    };
    for (const k of rows) {
      k.features = toArray(k.features);
      k.contents = toArray(k.contents);
    }

    res.setHeader('cache-control','s-maxage=300, stale-while-revalidate=86400');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
}
