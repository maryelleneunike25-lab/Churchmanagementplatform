import sql from '../_lib/db.js';
import { requireUser } from '../_lib/guard.js';
import { sendJson, sendError, getBody } from '../_lib/http.js';
import { logActivity } from '../_lib/audit.js';

function getTargetFromKey(key) {
  if (key.startsWith('attendance_session:')) return 'Absensi';
  if (key.startsWith('congregation:member:') || key.startsWith('member:')) return 'Data Jemaat';
  if (key.startsWith('komsel:') || key.startsWith('config:pks')) return 'Komsel';
  if (key.startsWith('finance:') || key.startsWith('keuangan:')) return 'Keuangan';
  if (key.startsWith('inventory:') || key.startsWith('inventaris:')) return 'Inventaris';
  if (key.startsWith('announcement:')) return 'Pengumuman';
  if (key.startsWith('gallery:')) return 'Galeri Foto';
  if (key.startsWith('team:')) return 'Tim Pelayanan';
  if (key.startsWith('registration:') || key.startsWith('registrasi:')) return 'Pendaftaran';
  return `KV (${key.split(':')[0] || 'Umum'})`;
}

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const { key } = req.query;
  if (!key) return sendError(res, 400, 'Key required');

  if (req.method === 'GET') {
    const records = await sql`SELECT value FROM app_kv WHERE key = ${key}`;
    return sendJson(res, 200, records.length > 0 ? records[0].value : null);
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const value = getBody(req);
    const valueJson = typeof value === 'string' ? value : JSON.stringify(value);
    await sql`
      INSERT INTO app_kv (key, value) VALUES (${key}, ${valueJson}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = ${valueJson}::jsonb, updated_at = now()
    `;

    const target = getTargetFromKey(key);
    await logActivity({
      userId: user.id,
      action: 'UPDATE',
      target,
      detail: { key, summary: `Menyimpan data pada ${target} (${key})` },
    });

    return sendJson(res, 200, { success: true });
  }
  
  if (req.method === 'DELETE') {
    await sql`DELETE FROM app_kv WHERE key = ${key}`;

    const target = getTargetFromKey(key);
    await logActivity({
      userId: user.id,
      action: 'DELETE',
      target,
      detail: { key, summary: `Menghapus data pada ${target} (${key})` },
    });

    return sendJson(res, 200, { success: true });
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return sendError(res, 405, 'Method not allowed');
}

