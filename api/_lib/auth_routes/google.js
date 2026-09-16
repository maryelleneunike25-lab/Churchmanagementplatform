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
      const allowlist = await sql`SELECT * FROM auth_allowlist WHERE email = ${email}`;
      const status = allowlist.length > 0 ? 'approved' : 'pending';
      const approvedBy = allowlist.length > 0 ? allowlist[0].added_by : null;

      const inserted = await sql`
        INSERT INTO users (email, name, google_id, auth_provider, status, approved_by, approved_at)
        VALUES (${email}, ${name}, ${googleId}, 'google', ${status}, ${approvedBy}, ${status === 'approved' ? sql`now()` : null})
        RETURNING *
      `;
      user = inserted[0];
    } else if (!user.google_id) {
      // Link Google ID to existing email/password account
      const updated = await sql`
        UPDATE users SET google_id = ${googleId}, auth_provider = 'keduanya'
        WHERE id = ${user.id} RETURNING *
      `;
      user = updated[0];
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
