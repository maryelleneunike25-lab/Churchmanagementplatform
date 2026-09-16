import bcrypt from 'bcryptjs';
import sql from '../_lib/db.js';
import { sendJson, sendError, getBody, requireMethod } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  const { email: rawEmail, password, name } = getBody(req);
  if (!rawEmail || !password || !name) return sendError(res, 400, 'Email, password, and name required');

  const email = rawEmail.toLowerCase();
  try {
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) return sendError(res, 400, 'Email sudah terdaftar');

    const hash = await bcrypt.hash(password, 10);
    const allowlist = await sql`SELECT * FROM auth_allowlist WHERE email = ${email}`;
    const status = allowlist.length > 0 ? 'approved' : 'pending';
    const approvedBy = allowlist.length > 0 ? allowlist[0].added_by : null;

    const inserted = await sql`
      INSERT INTO users (email, name, password_hash, auth_provider, status, approved_by, approved_at)
      VALUES (${email}, ${name}, ${hash}, 'email', ${status}, ${approvedBy}, ${status === 'approved' ? sql`now()` : null})
      RETURNING id, email, name, status, role
    `;
    
    return sendJson(res, 200, { success: true, user: inserted[0] });
  } catch (err) {
    return sendError(res, 500, 'Server error');
  }
}
