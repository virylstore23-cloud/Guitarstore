// api/kits.js — Supabase REST (no supabase-js)
export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: "Missing Supabase env vars" });
    }

    // Pull everything we need, including `category`
    const url = new URL(`${SUPABASE_URL}/rest/v1/drum_kits`);
    url.searchParams.set(
      "select",
      [
        "id","name","slug","description",
        "price","upc_code",
        "is_active","stock_level",
        "on_demo","on_demo_label",
        "primary_image_url","detail_image_url","video_url",
        "features","contents",
        "category",            // 👈 important
        "updated_at"
      ].join(",")
    );
    url.searchParams.set("order", "idx.asc,nullsLast"); // harmless if no idx

    const r = await fetch(url, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Accept": "application/json",
        "Prefer": "return=representation"
      },
      cache: "no-store"
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: "Supabase error", details: t });
    }

    const rows = await r.json();

    // Coerce fields and parse arrays that might be stored as JSON strings
    const kits = rows.map(k => {
      const parseMaybeJsonArray = (v) => {
        if (Array.isArray(v)) return v;
        if (typeof v === "string") {
          try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch { return []; }
        }
        return [];
      };

      return {
        id: k.id,
        name: k.name,
        slug: k.slug,
        description: k.description ?? "",
        price: typeof k.price === "number" ? k.price : Number(k.price ?? 0),
        upc_code: k.upc_code ?? "",
        is_active: !!k.is_active,
        stock_level: Number(k.stock_level ?? 0),
        on_demo: !!k.on_demo,
        on_demo_label: k.on_demo_label ?? null,
        primary_image_url: k.primary_image_url ?? null,
        detail_image_url: k.detail_image_url ?? null,
        video_url: k.video_url ?? null,
        features: parseMaybeJsonArray(k.features),
        contents: parseMaybeJsonArray(k.contents),

        // 👇 this is what the chip script reads
        category: (k.category || "").toString().trim(),

        updated_at: k.updated_at ?? null,
      };
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ kits });
  } catch (e) {
    return res.status(500).json({ error: "Unhandled in /api/kits", message: String(e?.message || e) });
  }
}
