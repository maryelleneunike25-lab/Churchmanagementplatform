import { verifySessionToken } from '../_lib/session.js';
import sql from '../_lib/db.js';
import { sendJson, sendError, requireMethod } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;
  const tokenPayload = verifySessionToken(req);
  if (!tokenPayload) return sendJson(res, 200, { success: false, user: null });

  try {
    const users = await sql`SELECT id, email, name, role, status, permissions, komisi_leader_of FROM users WHERE id = ${tokenPayload.userId}`;
    if (users.length === 0 || users[0].status !== 'approved') {
       return sendJson(res, 200, { success: false, user: null });
    }
    return sendJson(res, 200, { success: true, user: users[0] });
  } catch (err) {
    return sendError(res, 500, 'Server error');
  }
}
