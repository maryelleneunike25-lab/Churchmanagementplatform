import sql from '../db.js';
import { requireUser } from '../guard.js';
import { sendJson, sendError, getBody, requireMethod } from '../http.js';

export default async function handler(req, res) {
  const admin = await requireUser(req, res, { role: 'super_admin' });
  if (!admin) return;

  if (req.method === 'GET') {
    const list = await sql`
      SELECT a.email, a.added_at, u.name as added_by_name 
      FROM auth_allowlist a 
      LEFT JOIN users u ON a.added_by = u.id 
      ORDER BY a.added_at DESC
    `;
    return sendJson(res, 200, { success: true, data: list });
  } 
  
  if (req.method === 'POST') {
    const { email } = getBody(req);
    if (!email) return sendError(res, 400, 'Email required');
    await sql`INSERT INTO auth_allowlist (email, added_by) VALUES (${email.toLowerCase()}, ${admin.id}) ON CONFLICT DO NOTHING`;
    return sendJson(res, 200, { success: true });
  }
  
  if (req.method === 'DELETE') {
    const { email } = req.query;
    if (!email) return sendError(res, 400, 'Email required');
    await sql`DELETE FROM auth_allowlist WHERE email = ${email.toLowerCase()}`;
    return sendJson(res, 200, { success: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return sendError(res, 405, 'Method not allowed');
}
