import sql from './_lib/db.js';
import { requireUser } from './_lib/guard.js';
import { sendJson, sendError, getBody } from './_lib/http.js';

// Images are stored in Postgres (app_kv, key "img:<id>") and served by /api/content/img/<id>.
// Body: { contentType, data } where data is base64 (no data: prefix).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method Not Allowed');
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const { contentType = 'image/jpeg', data } = getBody(req);
  if (!data || typeof data !== 'string') return sendError(res, 400, 'Data gambar kosong');
  if (!/^image\/(jpeg|png|webp|gif)$/.test(contentType)) return sendError(res, 400, 'Format gambar tidak didukung');
  if (data.length > 4_000_000) return sendError(res, 413, 'Gambar terlalu besar');

  try {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const value = JSON.stringify({ contentType, data, by: user.id });
    await sql`INSERT INTO app_kv (key, value) VALUES (${'img:' + id}, ${value}::jsonb)`;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const url = `${proto}://${req.headers.host}/api/content/img/${id}`;
    return sendJson(res, 200, { success: true, url });
  } catch (error) {
    console.error('Upload error:', error);
    return sendError(res, 500, 'Gagal menyimpan gambar');
  }
}
