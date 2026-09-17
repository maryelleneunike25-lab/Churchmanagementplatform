import sql from '../../db.js';
import { requireUser } from '../../guard.js';
import { sendJson, sendError } from '../../http.js';

export default async function handler(req, res) {
  const admin = await requireUser(req, res, { role: 'super_admin' });
  if (!admin) return;

  if (req.method === 'GET') {
    try {
      const users = await sql`
        SELECT id, name, email, role, status, auth_provider, created_at, permissions 
        FROM users 
        ORDER BY created_at DESC
      `;
      return sendJson(res, 200, { success: true, data: users });
    } catch (err) {
      return sendError(res, 500, 'Database error');
    }
  }

  res.setHeader('Allow', 'GET');
  return sendError(res, 405, 'Method not allowed');
}
