import sql from '../_lib/db.js';
import { requireUser } from '../_lib/guard.js';
import { sendJson, sendError, getBody } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!(await requireUser(req, res))) return;

  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      const members = await sql`
        SELECT km.id, km.role, km.manual_name, km.manual_phone, km.manual_birth_date, j.name, j.phones, j.birth_date
        FROM komisi_members km
        LEFT JOIN jemaat j ON km.jemaat_id = j.id
        WHERE km.komisi_id = ${id}
      `;
      return sendJson(res, 200, members);
    }
    const komisis = await sql`SELECT * FROM komisi`;
    return sendJson(res, 200, komisis);
  }

  res.setHeader('Allow', 'GET');
  return sendError(res, 405, 'Method not allowed');
}
