import { OAuth2Client } from 'google-auth-library';
import sql from '../db.js';
import { issueSessionToken } from '../session.js';
import { sendJson, sendError, getBody, requireMethod } from '../http.js';

const client = new OAuth2Client();

const CLIENT_IDS = [
  process.env.VITE_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_ID,
  '647511928995-cp3lvq3pap1pg1am24qfouenodnuh1ne.apps.googleusercontent.com'
].filter(Boolean);

const SUPER_ADMIN_EMAILS = [
  'maryelleneunike25@gmail.com',
  'maryelleneun@gmail.com',
  'admin@gbijeltim.com'
];

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  const { credential } = getBody(req);
  if (!credential) return sendError(res, 400, 'Missing credential');

  // 1. Verify Google token via google-auth-library or OAuth2 tokeninfo fallback
  let payload = null;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: CLIENT_IDS,
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.warn('google-auth-library verifyIdToken failed, attempting tokeninfo endpoint:', err?.message);
    try {
      const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.email) {
          payload = data;
        }
      }
    } catch (fetchErr) {
      console.error('tokeninfo endpoint also failed:', fetchErr?.message);
    }
  }

  if (!payload || !payload.email) {
    return sendError(res, 401, 'Invalid Google token');
  }

  const isEmailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!isEmailVerified) {
    return sendError(res, 403, 'Email not verified by Google');
  }

  const email = payload.email.toLowerCase().trim();
  const googleId = payload.sub;
  const name = payload.name || email.split('@')[0];
  const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(email);

  // 2. Query / create user in DB, with graceful fallback if Neon quota is exceeded
  let user = null;
  try {
    let users = await sql`SELECT * FROM users WHERE google_id = ${googleId} OR email = ${email}`;
    user = users.length > 0 ? users[0] : null;

    if (!user) {
      // Check allowlist
      const allowlist = await sql`SELECT * FROM auth_allowlist WHERE email = ${email}`;
      const status = isSuperAdminEmail ? 'approved' : (allowlist.length > 0 ? 'approved' : 'pending');
      const role = isSuperAdminEmail ? 'super_admin' : 'admin';
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
      
      if (isSuperAdminEmail && (user.role !== 'super_admin' || user.status !== 'approved')) {
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
  } catch (dbError) {
    console.error('Database query failed during Google Auth:', dbError?.message);
    // If DB is temporarily unavailable or Neon quota exceeded, authenticate Super Admin gracefully
    if (isSuperAdminEmail) {
      user = {
        id: `superadmin-${googleId || 'maryellen'}`,
        email,
        name,
        role: 'super_admin',
        status: 'approved',
        permissions: { can_manage_users: true }
      };
    } else {
      return sendError(res, 503, 'Database sedang mengalami batasan kuota. Silakan hubungi Super Admin.');
    }
  }

  if (!user || user.status !== 'approved') {
    return sendJson(res, 200, { success: false, status: user?.status || 'pending', message: 'Akun menunggu persetujuan Super Admin.' });
  }

  const token = issueSessionToken(res, user.id, user.role, {
    email: user.email,
    name: user.name,
    permissions: user.permissions
  });

  return sendJson(res, 200, {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions
    }
  });
}
