// api/kits.js — robust Supabase REST proxy that always returns { kits: [...] }
export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: "Missing Supabase env", kits: [] });
    }

    // Ask only for columns we use, incl. 'category'
    const url = new URL(`${SUPABASE_URL}/rest/v1/drum_kits`);
    url.searchParams.set(
      "select",
      [
        "id","name","slug","description","price","upc_code",
        "is_active","stock_level","on_demo","on_demo_label",
        "primary_image_url","detail_image_url","video_url",
        "features","contents","category","updated_at"
      ].join(",")
    );
    url.searchParams.set("order", "name.asc");

    const r = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: "application/json",
      },
      // never cache – kiosk should always be fresh
      cache: "no-store",
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(r.status).json({ error: "Supabase error", message: text, kits: [] });
    }

    const rows = await r.json();

    // Helper to tolerate strings/arrays/null
    const parseMaybeJsonArray = (v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string" && v.trim()) {
        try { const j = JSON.parse(v); return Array.isArray(j) ? j : []; } catch { return []; }
      }
      return [];
    };

    const kits = (rows ?? []).map((k) => ({
      id: k.id ?? null,
      name: k.name ?? null,
      slug: k.slug ?? null,
      description: k.description ?? null,
      price: typeof k.price === "number" ? k.price : Number(k.price) || null,
      upc_code: k.upc_code ?? null,
      is_active: !!k.is_active,
      stock_level: typeof k.stock_level === "number" ? k.stock_level : Number(k.stock_level) || 0,
      on_demo: !!k.on_demo,
      on_demo_label: k.on_demo_label ?? null,
      primary_image_url: k.primary_image_url ?? null,
      detail_image_url: k.detail_image_url ?? null,
      video_url: k.video_url ?? null,
      features: parseMaybeJsonArray(k.features),
      contents: parseMaybeJsonArray(k.contents),
      // 👉 the chip script reads this
      category: (k.category ?? "").toString().trim(),
      updated_at: k.updated_at ?? null,
    }));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ kits });
  } catch (e) {
    return res.status(500).json({ error: "Unhandled in /api/kits", message: String(e?.message || e), kits: [] });
  }
}
