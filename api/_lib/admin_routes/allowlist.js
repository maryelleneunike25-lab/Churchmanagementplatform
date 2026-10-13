import sql from '../db.js';
import { requireUser } from '../guard.js';
import { sendJson, sendError, getBody, requireMethod } from '../http.js';

export default async function handler(req, res) {
  const admin = await requireUser(req, res, { role: 'super_admin' });
  if (!admin) return;

  if (req.method === 'GET') {
    try {
      const list = await sql`
        SELECT a.email, a.added_at, u.name as added_by_name 
        FROM auth_allowlist a 
        LEFT JOIN users u ON a.added_by = u.id 
        ORDER BY a.added_at DESC
      `;
      return sendJson(res, 200, { success: true, data: list });
    } catch (err) {
      console.warn('allowlist GET DB error:', err?.message);
      return sendJson(res, 200, { success: true, data: [], quotaExceeded: true });
    }
  } 
  
  if (req.method === 'POST') {
    const { email: rawEmail } = getBody(req);
    if (!rawEmail) return sendError(res, 400, 'Email required');
    const email = rawEmail.toLowerCase().trim();
    if (!email.includes('@')) return sendError(res, 400, 'Email tidak valid');

    await sql`INSERT INTO auth_allowlist (email, added_by) VALUES (${email}, ${admin.id}) ON CONFLICT DO NOTHING`;

    // Ensure user immediately appears in User Management
    const existing = await sql`SELECT id, role, status FROM users WHERE email = ${email}`;
    if (existing.length === 0) {
      const defaultName = email.split('@')[0];
      await sql`
        INSERT INTO users (email, name, role, status, auth_provider, approved_by, approved_at)
        VALUES (${email}, ${defaultName}, 'admin', 'approved', 'allowlist', ${admin.id}, now())
      `;
    } else {
      await sql`
        UPDATE users
        SET status = 'approved',
            role = CASE WHEN role = 'jemaat' THEN 'admin' ELSE role END,
            approved_by = COALESCE(approved_by, ${admin.id}),
            approved_at = COALESCE(approved_at, now())
        WHERE email = ${email}
      `;
    }

    return sendJson(res, 200, { success: true });
  }
  
  if (req.method === 'DELETE') {
    const { email: rawEmail } = req.query;
    if (!rawEmail) return sendError(res, 400, 'Email required');
    const email = rawEmail.toLowerCase().trim();

    await sql`DELETE FROM auth_allowlist WHERE email = ${email}`;
    // If user was created by allowlist and hasn't logged in with a custom password or Google, clean up from users
    await sql`DELETE FROM users WHERE email = ${email} AND auth_provider = 'allowlist'`;

    return sendJson(res, 200, { success: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return sendError(res, 405, 'Method not allowed');
}
