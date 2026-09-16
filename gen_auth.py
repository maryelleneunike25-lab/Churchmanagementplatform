import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

# ----------------- AUTH ENDPOINTS -----------------

write_file('api/auth/google.js', '''
import { OAuth2Client } from 'google-auth-library';
import sql from '../_lib/db.js';
import { issueSessionToken } from '../_lib/session.js';
import { sendJson, sendError, getBody, requireMethod } from '../_lib/http.js';

const client = new OAuth2Client();

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  const { credential } = getBody(req);
  if (!credential) return sendError(res, 400, 'Missing credential');

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
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
''')

write_file('api/auth/login.js', '''
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
''')

write_file('api/auth/register.js', '''
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
''')

write_file('api/auth/me.js', '''
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
''')

write_file('api/auth/logout.js', '''
import { clearSession } from '../_lib/session.js';
import { sendJson, requireMethod } from '../_lib/http.js';

export default function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  clearSession(res);
  return sendJson(res, 200, { success: true });
}
''')

# ----------------- ADMIN ENDPOINTS -----------------
write_file('api/admin/pending.js', '''
import sql from '../_lib/db.js';
import { requireUser } from '../_lib/guard.js';
import { sendJson, requireMethod } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;
  if (!(await requireUser(req, res, { role: 'super_admin' }))) return;

  const users = await sql`SELECT id, email, name, auth_provider, created_at, status FROM users WHERE status = 'pending' ORDER BY created_at DESC`;
  return sendJson(res, 200, { success: true, data: users });
}
''')

write_file('api/admin/allowlist.js', '''
import sql from '../_lib/db.js';
import { requireUser } from '../_lib/guard.js';
import { sendJson, sendError, getBody, requireMethod } from '../_lib/http.js';

export default async function handler(req, res) {
  const admin = await requireUser(req, res, { role: 'super_admin' });
  if (!admin) return;

  if (req.method === 'GET') {
    const list = await sql`
      SELECT a.email, a.added_at, u.name as added_by_name 
      FROM auth_allowlist a 
      LEFT JOIN users u ON a.added_by = u.id 
      ORDER BY a.added_at DESC
    `;
    return sendJson(res, 200, { success: true, data: list });
  } 
  
  if (req.method === 'POST') {
    const { email } = getBody(req);
    if (!email) return sendError(res, 400, 'Email required');
    await sql`INSERT INTO auth_allowlist (email, added_by) VALUES (${email.toLowerCase()}, ${admin.id}) ON CONFLICT DO NOTHING`;
    return sendJson(res, 200, { success: true });
  }
  
  if (req.method === 'DELETE') {
    const { email } = req.query;
    if (!email) return sendError(res, 400, 'Email required');
    await sql`DELETE FROM auth_allowlist WHERE email = ${email.toLowerCase()}`;
    return sendJson(res, 200, { success: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return sendError(res, 405, 'Method not allowed');
}
''')

# ----------------- BOOTSTRAP ADMIN SCRIPT -----------------
write_file('scripts/bootstrap-admin.mjs', '''
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);
const adminEmail = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;

if (!adminEmail) {
  console.error("BOOTSTRAP_SUPER_ADMIN_EMAIL is not set.");
  process.exit(1);
}

async function bootstrap() {
  const hash = await bcrypt.hash('password123', 10);
  await sql`
    INSERT INTO users (email, name, password_hash, auth_provider, status, role, permissions)
    VALUES (${adminEmail}, 'Super Admin', ${hash}, 'email', 'approved', 'super_admin', '{"can_manage_users": true}')
    ON CONFLICT (email) DO UPDATE SET role = 'super_admin', status = 'approved'
  `;
  console.log(`Bootstrapped super_admin for ${adminEmail}`);
  process.exit(0);
}
bootstrap();
''')

print("Generated Phase 2 backend files.")
