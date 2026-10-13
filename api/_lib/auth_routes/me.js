import { verifySessionToken } from '../session.js';
import sql from '../db.js';
import { sendJson, sendError, requireMethod } from '../http.js';

const SUPER_ADMIN_EMAILS = [
  'maryelleneunike25@gmail.com',
  'maryelleneun@gmail.com',
  'admin@gbijeltim.com'
];

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;
  const tokenPayload = verifySessionToken(req);
  if (!tokenPayload) return sendJson(res, 200, { success: false, user: null });

  const isSuperAdmin = tokenPayload.role === 'super_admin' || (tokenPayload.email && SUPER_ADMIN_EMAILS.includes(tokenPayload.email.toLowerCase()));

  try {
    const users = await sql`SELECT id, email, name, role, status, permissions, komisi_leader_of FROM users WHERE id = ${tokenPayload.userId}`;
    if (users.length === 0 || users[0].status !== 'approved') {
      if (isSuperAdmin) {
        return sendJson(res, 200, {
          success: true,
          user: {
            id: tokenPayload.userId,
            email: tokenPayload.email || 'maryelleneun@gmail.com',
            name: tokenPayload.name || 'Maryellen',
            role: 'super_admin',
            status: 'approved',
            permissions: tokenPayload.permissions || { can_manage_users: true }
          }
        });
      }
      return sendJson(res, 200, { success: false, user: null });
    }
    return sendJson(res, 200, { success: true, user: users[0] });
  } catch (err) {
    console.error('me.js error:', err?.message);
    if (isSuperAdmin) {
      return sendJson(res, 200, {
        success: true,
        user: {
          id: tokenPayload.userId,
          email: tokenPayload.email || 'maryelleneun@gmail.com',
          name: tokenPayload.name || 'Maryellen',
          role: 'super_admin',
          status: 'approved',
          permissions: tokenPayload.permissions || { can_manage_users: true }
        }
      });
    }
    return sendError(res, 500, 'Server error');
  }
}
