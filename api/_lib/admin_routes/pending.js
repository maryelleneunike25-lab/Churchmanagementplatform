import sql from '../db.js';
import { requireUser } from '../guard.js';
import { sendJson, sendError, requireMethod } from '../http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;
  if (!(await requireUser(req, res, { role: 'super_admin' }))) return;

  try {
    const users = await sql`SELECT id, email, name, auth_provider, created_at, status FROM users WHERE status = 'pending' ORDER BY created_at DESC`;
    return sendJson(res, 200, { success: true, data: users });
  } catch (err) {
    console.warn('pending.js DB error:', err?.message);
    // Graceful fallback when database quota is exceeded or unreachable
    return sendJson(res, 200, { success: true, data: [], quotaExceeded: true });
  }
}
