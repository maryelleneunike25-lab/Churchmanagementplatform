import sql from '../_lib/db.js';
import { requireUser } from '../_lib/guard.js';
import { sendJson, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!(await requireUser(req, res))) return;

  if (req.method === 'GET') {
    const { prefix } = req.query;
    if (!prefix) return sendError(res, 400, 'Prefix required');

    const records = await sql`
      SELECT key, value 
      FROM app_kv 
      WHERE key LIKE ${prefix + '%'}
    `;
    return sendJson(res, 200, { data: records });
  }

  res.setHeader('Allow', 'GET');
  return sendError(res, 405, 'Method not allowed');
}
