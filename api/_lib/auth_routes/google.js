import { OAuth2Client } from 'google-auth-library';
import sql from '../db.js';
import { issueSessionToken } from '../session.js';
import { sendJson, sendError, getBody, requireMethod } from '../http.js';

const client = new OAuth2Client();

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  const { credential } = getBody(req);
  if (!credential) return sendError(res, 400, 'Missing credential');

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload.email_verified) return sendError(res, 403, 'Email not verified by Google');

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;
    const name = payload.name;

    let users = await sql`SELECT * FROM users WHERE google_id = ${googleId} OR email = ${email}`;
    let user = users.length > 0 ? users[0] : null;

    if (!user) {
      // Check allowlist
      const isSuperAdminEmail = email === 'maryelleneunike25@gmail.com';
      const allowlist = await sql`SELECT * FROM auth_allowlist WHERE email = ${email}`;
      const status = isSuperAdminEmail ? 'approved' : (allowlist.length > 0 ? 'approved' : 'pending');
      const role = isSuperAdminEmail ? 'super_admin' : 'jemaat';
      const approvedBy = allowlist.length > 0 ? allowlist[0].added_by : null;

      const inserted = await sql`
        INSERT INTO users (email, name, google_id, auth_provider, status, role, approved_by, approved_at)
        VALUES (${email}, ${name}, ${googleId}, 'google', ${status}, ${role}, ${approvedBy}, ${status === 'approved' ? sql`now()` : null})
        RETURNING *
      `;
      user = inserted[0];
    } else {
      let needsUpdate = false;
      const updateData = {};
      
      if (!user.google_id) {
        updateData.google_id = googleId;
        updateData.auth_provider = 'keduanya';
        needsUpdate = true;
      }
      
      if (email === 'maryelleneunike25@gmail.com' && (user.role !== 'super_admin' || user.status !== 'approved')) {
        updateData.role = 'super_admin';
        updateData.status = 'approved';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        const updated = await sql`
          UPDATE users SET 
            google_id = COALESCE(${updateData.google_id || null}, google_id),
            auth_provider = COALESCE(${updateData.auth_provider || null}, auth_provider),
            role = COALESCE(${updateData.role || null}, role),
            status = COALESCE(${updateData.status || null}, status)
          WHERE id = ${user.id} RETURNING *
        `;
        user = updated[0];
      }
    }

    if (user.status !== 'approved') {
      return sendJson(res, 200, { success: false, status: user.status, message: 'Akun menunggu persetujuan Super Admin.' });
    }

    issueSessionToken(res, user.id, user.role);
    return sendJson(res, 200, { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Google Auth Error:', error);
    return sendError(res, 401, 'Invalid Google token');
  }
}
