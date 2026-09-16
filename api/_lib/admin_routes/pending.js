import sql from '../_lib/db.js';
import { requireUser } from '../_lib/guard.js';
import { sendJson, requireMethod } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;
  if (!(await requireUser(req, res, { role: 'super_admin' }))) return;

  const users = await sql`SELECT id, email, name, auth_provider, created_at, status FROM users WHERE status = 'pending' ORDER BY created_at DESC`;
  return sendJson(res, 200, { success: true, data: users });
}
