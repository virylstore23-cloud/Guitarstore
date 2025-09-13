// api/kits.js — Supabase REST (no supabase-js)

// robust array coercion
function toArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      try { return JSON.parse(s); } catch { return []; }
    }
    return s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
  }
  return [];
}

module.exports = async (req, res) => {
  const started = Date.now();
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({
        error: "Missing SUPABASE env vars",
        have: { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY }
      });
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/drum_kits`);
    url.searchParams.set("select", [
      "id","name","slug","description","price","upc_code",
      "is_active","stock_level","on_demo","on_demo_label",
      "primary_image_url","detail_image_url","video_url",
      "features","contents","images","updated_at"
    ].join(","));
    url.searchParams.set("is_active","eq.true");
    url.searchParams.set("order","name.asc");

    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "count=exact",
        "Cache-Control": "no-cache"
      }
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(500).json({
        error: "Supabase non-200",
        status: r.status,
        body: text.slice(0,400),
        elapsed_ms: Date.now()-started
      });
    }

    let rows = [];
    try { rows = JSON.parse(text) || []; }
    catch (e) {
      return res.status(500).json({
        error: "JSON parse failed",
        message: String(e?.message || e),
        sample: text.slice(0,200)
      });
    }

    const kits = rows.map(k => ({
      ...k,
      price: k.price == null ? null : Number(k.price),
      features: toArray(k.features),
      contents: toArray(k.contents),
      images: toArray(k.images)
    }));

    res.setHeader("Cache-Control","no-store");
    return res.status(200).json({ ok:true, count:kits.length, kits, elapsed_ms: Date.now()-started });
  } catch (e) {
    return res.status(500).json({ error: "Unhandled in /api/kits", message: String(e?.message || e) });
  }
};
