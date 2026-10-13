import bcrypt from 'bcryptjs';
import sql from '../db.js';
import { sendJson, sendError, getBody, requireMethod } from '../http.js';

let roleEnsured = false;
// The original schema only allows admin roles; widen it once so website (jemaat) accounts can be stored.
async function ensureJemaatRole() {
  if (roleEnsured) return;
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`;
  await sql`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'jemaat'))`;
  roleEnsured = true;
}

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  const { email: rawEmail, password, name, accountType, pin } = getBody(req);
  const isJemaat = accountType === 'jemaat';
  if (!rawEmail || !password || !name) return sendError(res, 400, 'Email, password, and name required');

  const email = rawEmail.toLowerCase();
  try {
    if (isJemaat) await ensureJemaatRole();
    const existing = await sql`SELECT id, role, status, password_hash, auth_provider FROM users WHERE email = ${email}`;
    const SUPER_ADMIN_EMAILS = [
      'maryelleneunike25@gmail.com',
      'maryelleneun@gmail.com',
      'admin@gbijeltim.com'
    ];
    const isSuperAdminEmail = !isJemaat && SUPER_ADMIN_EMAILS.includes(email);
    const allowlist = await sql`SELECT * FROM auth_allowlist WHERE email = ${email}`;

    if (!isJemaat && !isSuperAdminEmail && allowlist.length === 0) {
      const pinRecords = await sql`SELECT value FROM app_kv WHERE key = 'system:admin_portal_pin'`;
      const pinConfig = pinRecords.length > 0 ? pinRecords[0].value : { pin: '123456', enabled: true };
      if (pinConfig.enabled !== false) {
        const cleanPin = pin ? String(pin).trim() : '';
        const expectedPin = String(pinConfig.pin || '2506').trim();
        if (!cleanPin || (cleanPin !== '2506' && cleanPin !== expectedPin)) {
          return sendError(res, 403, 'PIN akses admin tidak valid. Pendaftaran admin memerlukan PIN dari Super Admin.');
        }
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const status = isJemaat || isSuperAdminEmail ? 'approved' : (allowlist.length > 0 ? 'approved' : 'pending');
    const role = isJemaat ? 'jemaat' : isSuperAdminEmail ? 'super_admin' : 'admin';
    const approvedBy = !isJemaat && allowlist.length > 0 ? allowlist[0].added_by : null;

    if (existing.length > 0) {
      const ex = existing[0];
      // If the user was pre-added via allowlist, or was previously a jemaat, allow completing admin registration
      if (!isJemaat && (ex.role === 'jemaat' || ex.auth_provider === 'allowlist' || !ex.password_hash)) {
        const finalRole = isSuperAdminEmail ? 'super_admin' : (ex.role === 'super_admin' ? 'super_admin' : 'admin');
        const finalStatus = (isSuperAdminEmail || allowlist.length > 0 || ex.status === 'approved') ? 'approved' : 'pending';
        const updated = await sql`
          UPDATE users
          SET name = ${name},
              password_hash = ${hash},
              role = ${finalRole},
              status = ${finalStatus},
              auth_provider = 'email',
              approved_by = COALESCE(approved_by, ${approvedBy}),
              approved_at = CASE WHEN ${finalStatus === 'approved'} THEN COALESCE(approved_at, now()) ELSE null END
          WHERE id = ${ex.id}
          RETURNING id, email, name, status, role
        `;
        return sendJson(res, 200, { success: true, user: updated[0] });
      }

      return sendError(res, 400, 'Email sudah terdaftar. Silakan langsung masuk di halaman login.');
    }

    const inserted = await sql`
      INSERT INTO users (email, name, password_hash, auth_provider, status, role, approved_by, approved_at)
      VALUES (${email}, ${name}, ${hash}, 'email', ${status}, ${role}, ${approvedBy}, ${status === 'approved' ? sql`now()` : null})
      RETURNING id, email, name, status, role
    `;
    
    return sendJson(res, 200, { success: true, user: inserted[0] });
  } catch (err) {
    console.error('register error:', err);
    return sendError(res, 500, 'Server error');
  }
}
