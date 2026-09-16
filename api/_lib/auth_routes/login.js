import bcrypt from 'bcryptjs';
import sql from '../_lib/db.js';
import { issueSessionToken } from '../_lib/session.js';
import { sendJson, sendError, getBody, requireMethod } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  const { email: rawEmail, password } = getBody(req);
  if (!rawEmail || !password) return sendError(res, 400, 'Email and password required');

  const email = rawEmail.toLowerCase();
  try {
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (users.length === 0) return sendError(res, 401, 'Email atau password salah');
    
    const user = users[0];
    if (!user.password_hash) return sendError(res, 401, 'Akun ini terdaftar dengan Google. Silakan login dengan Google.');

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return sendError(res, 401, 'Email atau password salah');

    if (user.status !== 'approved') {
      return sendJson(res, 200, { success: false, status: user.status, message: 'Akun belum disetujui.' });
    }

    issueSessionToken(res, user.id, user.role);
    return sendJson(res, 200, { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    return sendError(res, 500, 'Server error');
  }
}
