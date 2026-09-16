import sql from '../../_lib/db.js';
import { requireUser } from '../../_lib/guard.js';
import { sendJson, sendError, getBody } from '../../_lib/http.js';

export default async function handler(req, res) {
  if (!(await requireUser(req, res))) return;

  const { key } = req.query;
  if (!key) return sendError(res, 400, 'Key required');

  if (req.method === 'GET') {
    const records = await sql`SELECT value FROM app_kv WHERE key = ${key}`;
    return sendJson(res, 200, records.length > 0 ? records[0].value : null);
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const value = getBody(req);
    await sql`
      INSERT INTO app_kv (key, value) VALUES (${key}, ${value}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = ${value}::jsonb, updated_at = now()
    `;
    return sendJson(res, 200, { success: true });
  }
  
  if (req.method === 'DELETE') {
    await sql`DELETE FROM app_kv WHERE key = ${key}`;
    return sendJson(res, 200, { success: true });
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return sendError(res, 405, 'Method not allowed');
}
