export default async function handler(req, res) {
  try {
    // simple safe ping
    await fetch("https://guitarstore-zeta.vercel.app");

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(200).json({ ok: true }); // still return ok
  }
}
