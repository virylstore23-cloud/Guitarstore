export default async function handler(req, res) {
  try {
    const response = await fetch(process.env.SUPABASE_URL, {
      method: "GET"
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
}
