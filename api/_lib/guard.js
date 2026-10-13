import sql from './db.js';
import { verifySessionToken } from './session.js';
import { sendError } from './http.js';

const SUPER_ADMIN_EMAILS = [
  'maryelleneunike25@gmail.com',
  'maryelleneun@gmail.com',
  'admin@gbijeltim.com'
];

export async function requireUser(req, res, options = {}) {
  const tokenPayload = verifySessionToken(req);
  if (!tokenPayload) {
    sendError(res, 401, 'Unauthorized');
    return null;
  }

  const isSuperAdmin = tokenPayload.role === 'super_admin' || (tokenPayload.email && SUPER_ADMIN_EMAILS.includes(tokenPayload.email.toLowerCase()));

  try {
    const users = await sql`
      SELECT id, email, name, role, status, permissions
      FROM users
      WHERE id = ${tokenPayload.userId}
    `;

    if (users.length === 0) {
      if (isSuperAdmin) {
        return {
          id: tokenPayload.userId,
          email: tokenPayload.email || 'maryelleneun@gmail.com',
          name: tokenPayload.name || 'Maryellen',
          role: 'super_admin',
          status: 'approved',
          permissions: tokenPayload.permissions || { can_manage_users: true }
        };
      }
      sendError(res, 401, 'User not found');
      return null;
    }

    const user = users[0];

    // Congregation (website) accounts can never use admin APIs.
    if (user.role === 'jemaat' && !options.allowJemaat) {
      sendError(res, 403, 'Akun jemaat tidak memiliki akses admin.');
      return null;
    }

    if (user.status !== 'approved') {
      sendError(res, 403, 'Account is not approved yet.');
      return null;
    }

    if (options.role && user.role !== options.role) {
      sendError(res, 403, `Requires ${options.role} role.`);
      return null;
    }

    if (options.permission) {
      if (user.role !== 'super_admin' && !user.permissions?.[options.permission]) {
        sendError(res, 403, `Missing permission: ${options.permission}`);
        return null;
      }
    }

    return user;
  } catch (error) {
    console.error('requireUser error:', error?.message);
    if (isSuperAdmin) {
      return {
        id: tokenPayload.userId,
        email: tokenPayload.email || 'maryelleneun@gmail.com',
        name: tokenPayload.name || 'Maryellen',
        role: 'super_admin',
        status: 'approved',
        permissions: tokenPayload.permissions || { can_manage_users: true }
      };
    }
    sendError(res, 500, 'Internal server error validating session');
    return null;
  }
}
