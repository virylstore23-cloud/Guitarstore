export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  try {
    const r = await fetch(url + "/rest/v1/drum_kits?select=id&limit=1", { headers: { apikey: key, Authorization: "Bearer " + key } });
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok, status: r.status });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
