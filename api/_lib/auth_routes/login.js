import bcrypt from 'bcryptjs';
import sql from '../db.js';
import { issueSessionToken } from '../session.js';
import { sendJson, sendError, getBody, requireMethod } from '../http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  const { email: rawEmail, password } = getBody(req);
  if (!rawEmail || !password) return sendError(res, 400, 'Email and password required');

  const email = rawEmail.toLowerCase();
  try {
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (users.length === 0) return sendError(res, 401, 'Email atau password salah');
    
    let user = users[0];

    const SUPER_ADMIN_EMAILS = [
      'maryelleneunike25@gmail.com',
      'maryelleneun@gmail.com',
      'admin@gbijeltim.com'
    ];
    const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(email);

    // Auto promote default superadmin
    if (isSuperAdminEmail && (user.role !== 'super_admin' || user.status !== 'approved')) {
      const updated = await sql`
        UPDATE users SET role = 'super_admin', status = 'approved'
        WHERE id = ${user.id} RETURNING *
      `;
      user = updated[0];
    }

    if (!user.password_hash) return sendError(res, 401, 'Akun ini terdaftar dengan Google. Silakan login dengan Google.');

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return sendError(res, 401, 'Email atau password salah');

    if (user.status !== 'approved') {
      return sendJson(res, 200, { success: false, status: user.status, message: 'Akun belum disetujui.' });
    }

    const token = issueSessionToken(res, user.id, user.role, {
      email: user.email,
      name: user.name,
      permissions: user.permissions
    });

    // Update presence & log activity
    const userAgent = req.headers['user-agent'] || null;
    await sql`
      UPDATE users 
      SET last_seen_at = now(), user_agent = ${userAgent ? String(userAgent).slice(0, 255) : null}
      WHERE id = ${user.id}
    `;

    try {
      const { logActivity } = await import('../audit.js');
      await logActivity({
        userId: user.id,
        action: 'LOGIN',
        target: 'Autentikasi',
        detail: { message: `Pengguna ${user.name} (${user.email}) berhasil login`, userAgent },
      });
    } catch {}

    return sendJson(res, 200, { success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.warn('login.js DB error:', err?.message);
    const SUPER_ADMIN_EMAILS = [
      'maryelleneunike25@gmail.com',
      'maryelleneun@gmail.com',
      'admin@gbijeltim.com'
    ];
    if (SUPER_ADMIN_EMAILS.includes(email)) {
      // Super admin emergency fallback during DB quota limits
      const fallbackId = `superadmin-${email}`;
      const token = issueSessionToken(res, fallbackId, 'super_admin', {
        email,
        name: 'Maryellen',
        permissions: { can_manage_users: true }
      });
      return sendJson(res, 200, {
        success: true,
        token,
        user: { id: fallbackId, email, name: 'Maryellen', role: 'super_admin' },
        quotaExceeded: true
      });
    }
    return sendError(res, 503, 'Database sedang mencapai batas kuota Neon. Silakan aktifkan kuota di console Neon.');
  }
}

